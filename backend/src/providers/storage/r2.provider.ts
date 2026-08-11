import type { StorageProvider } from './storage.interface.js'

export interface R2StorageConfig {
  bucket: R2Bucket
  publicDomain?: string
}

const normalizePath = (path: string) => path.replace(/^\/+/, '')

export class R2StorageProvider implements StorageProvider {
  constructor(private readonly config: R2StorageConfig) {}

  async upload(_tenantId: string, path: string, file: Buffer, contentType: string): Promise<string> {
    const key = normalizePath(path)
    try {
      await this.config.bucket.put(key, file, {
        httpMetadata: {
          contentType: contentType,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      })
    } catch (error) {
      console.error(`R2 Upload Failed for key: ${key}`, error)
      throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return this.publicUrlForKey(key)
  }

  async delete(_tenantId: string, path: string): Promise<void> {
    const key = normalizePath(path)
    try {
      await this.config.bucket.delete(key)
    } catch (error) {
      console.error(`R2 Delete Failed for key: ${key}`, error)
      throw new Error(`Failed to delete file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getSignedUrl(_tenantId: string, path: string, _expiresIn: number): Promise<string> {
    // For now, we return the public URL as requested by the user's setup.
    // Native R2 signing without the S3 SDK is complex in Workers.
    return this.publicUrlForKey(path)
  }

  private publicUrlForKey(key: string): string {
    const cleanKey = normalizePath(key)
    if (this.config.publicDomain) {
      const base = this.config.publicDomain.replace(/\/+$/, '')
      return `${base}/${cleanKey}`
    }
    
    // Fallback or dev URL if provided via env
    return `https://pub-placeholder.r2.dev/${cleanKey}`
  }
}
