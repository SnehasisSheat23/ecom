import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { StorageProvider } from './storage.interface.js'

const required = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const normalizePath = (path: string) => {
  let clean = path.replace(/^\/+/, '')
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const u = new URL(clean)
      clean = u.pathname.replace(/^\/+/, '')
    } catch (_) {}
  }
  return clean
}

export interface S3StorageConfig {
  bucket: string
  region: string
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl?: string
  forcePathStyle?: boolean
}

import { getOptionalEnv } from '../../lib/env.js'

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client

  constructor(private readonly config: S3StorageConfig) {
    const isR2 = Boolean(config.endpoint?.includes('r2.cloudflarestorage.com'))
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? (isR2 ? false : Boolean(config.endpoint)),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  static fromEnv(): S3StorageProvider {
    const bucket = getOptionalEnv('S3_BUCKET') ?? getOptionalEnv('AWS_S3_BUCKET')
    const region = getOptionalEnv('S3_REGION') ?? getOptionalEnv('AWS_S3_REGION') ?? getOptionalEnv('AWS_REGION')
    const accessKeyId = getOptionalEnv('S3_ACCESS_KEY_ID') ?? getOptionalEnv('AWS_S3_ACCESS_KEY_ID') ?? getOptionalEnv('AWS_ACCESS_KEY_ID')
    const secretAccessKey = getOptionalEnv('S3_SECRET_ACCESS_KEY') ?? getOptionalEnv('AWS_S3_SECRET_ACCESS_KEY') ?? getOptionalEnv('AWS_SECRET_ACCESS_KEY')
    const endpoint = getOptionalEnv('S3_ENDPOINT') ?? getOptionalEnv('AWS_S3_ENDPOINT')
    const publicBaseUrl = getOptionalEnv('S3_PUBLIC_BASE_URL') ?? getOptionalEnv('AWS_S3_PUBLIC_BASE_URL')
    const forcePathStyle = (getOptionalEnv('S3_FORCE_PATH_STYLE') ?? getOptionalEnv('AWS_S3_FORCE_PATH_STYLE')) === 'true'

    return new S3StorageProvider({
      bucket: required(bucket, 'S3_BUCKET / AWS_S3_BUCKET'),
      region: required(region, 'S3_REGION / AWS_S3_REGION / AWS_REGION'),
      accessKeyId: required(accessKeyId, 'S3_ACCESS_KEY_ID / AWS_S3_ACCESS_KEY_ID / AWS_ACCESS_KEY_ID'),
      secretAccessKey: required(secretAccessKey, 'S3_SECRET_ACCESS_KEY / AWS_S3_SECRET_ACCESS_KEY / AWS_SECRET_ACCESS_KEY'),
      endpoint,
      publicBaseUrl,
      forcePathStyle,
    })
  }

  async upload(_tenantId: string, path: string, file: Buffer, contentType: string): Promise<string> {
    const key = normalizePath(path)
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: file,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      )
    } catch (error) {
      console.error(`S3 Upload Failed for key: ${key}`, error)
      throw new Error(`Failed to upload file to storage: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    if (this.config.publicBaseUrl) {
      return this.publicUrlForKey(key)
    }

    return this.getSignedUrl(_tenantId, key, 604800)
  }

  async delete(_tenantId: string, path: string): Promise<void> {
    const key = normalizePath(path)
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      )
    } catch (error) {
      console.warn(`S3 Delete Warning for key: ${key}`, error)
    }
  }

  async getSignedUrl(_tenantId: string, path: string, expiresIn: number): Promise<string> {
    const key = normalizePath(path)
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
        { expiresIn },
      )
    } catch (error) {
      console.error(`S3 Signed URL Generation Failed for key: ${key}`, error)
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private publicUrlForKey(key: string): string {
    const cleanKey = normalizePath(key)
    
    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${cleanKey}`
    }

    if (this.config.endpoint) {
      const base = this.config.endpoint.replace(/\/+$/, '')
      // Standard path-style for custom endpoints (like R2/MinIO)
      return `${base}/${this.config.bucket}/${cleanKey}`
    }

    // Default AWS S3 virtual-hosted style URL
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${cleanKey}`
  }
}
