import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface StorageConfig {
  bucket: string
  region: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl?: string
}

export class StorageService {
  private client: S3Client
  private config: StorageConfig

  constructor() {
    this.config = {
      bucket: process.env.S3_BUCKET || 'dubram-assets',
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || 'https://7fc0b8cb45ec5b7ead36c4fe8d05b02b.r2.cloudflarestorage.com',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '7a26f459b6b6f6f6d0b31c6f19d16564',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'd2945adc472f45e3be58df62e6f0735f21e23090d1974dc1ab843f161a2bb133',
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev',
    }

    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    })
  }

  async uploadFile(filename: string, fileBuffer: Buffer | ArrayBuffer, contentType: string = 'image/png'): Promise<string> {
    const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: fileBuffer instanceof Buffer ? fileBuffer : Buffer.from(new Uint8Array(fileBuffer)),
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${key}`
    }

    return `${this.config.endpoint.replace(/\/+$/, '')}/${this.config.bucket}/${key}`
  }

  async deleteFile(key: string): Promise<void> {
    const cleanKey = key.replace(this.config.publicBaseUrl || '', '').replace(/^\/+/, '')
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: cleanKey,
        })
      )
    } catch (err) {
      console.warn('Failed to delete file from Cloudflare R2:', err)
    }
  }

  async getPresignedUploadUrl(filename: string, contentType: string = 'image/png', expiresIn: number = 3600): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn })
    const publicUrl = this.config.publicBaseUrl ? `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${key}` : uploadUrl

    return { uploadUrl, publicUrl, key }
  }
}

export const storageService = new StorageService()
