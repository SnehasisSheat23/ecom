import { AppError } from '../../lib/errors.js'
import type { StorageProvider } from '../../providers/storage/storage.interface.js'
import { mediaAssetPath } from '../../lib/storage-paths.js'
import type { MediaRepository } from './media.repository.js'
import type { MediaAsset, ListMediaOptions } from './media.types.js'
import type { PaginatedResult } from '../../lib/types.js'

export interface MediaActor {
  customerId: string
  tenantId: string
  activePartnerId: string | null
  isAdmin: boolean
  isSuperAdmin: boolean
}

export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly storage?: StorageProvider,
  ) {}

  async uploadAsset(
    tenantId: string,
    partnerId: string | null,
    filename: string,
    contentType: string,
    content: Buffer,
    actor?: MediaActor,
  ): Promise<MediaAsset> {
    // Validate vendor ownership/actions
    if (actor && !actor.isAdmin && !actor.isSuperAdmin) {
      if (partnerId !== actor.activePartnerId) {
        throw new AppError('Unauthorized vendor action', 403, 'forbidden')
      }
    }

    if (content.length > 10 * 1024 * 1024) {
      throw new AppError('File exceeds 10MB limit', 400, 'file-too-large')
    }

    let url = `memory://${filename}`
    let storagePath: string | null = null

    console.log(`[Media Upload]: Attempting upload of filename=${filename}. Storage provider present: ${!!this.storage}`)
    if (this.storage) {
      storagePath = mediaAssetPath(tenantId, partnerId, filename)
      url = await this.storage.upload(tenantId, storagePath, content, contentType)
      console.log(`[Media Upload]: Success. URL generated: ${url}`)
    } else {
      console.warn(`[Media Upload]: No storage provider detected! Falling back to memory URL.`)
    }

    return this.repository.createAsset(tenantId, {
      partnerId,
      url,
      storagePath,
      filename,
      mimeType: contentType,
      sizeBytes: content.length,
    })
  }

  async listAssets(
    tenantId: string,
    options: ListMediaOptions,
    actor?: MediaActor,
  ): Promise<PaginatedResult<MediaAsset>> {
    // If actor is a vendor, force filter to their own partnerId
    let targetVendorId = options.partnerId
    if (actor && !actor.isAdmin && !actor.isSuperAdmin) {
      targetVendorId = actor.activePartnerId ?? null
    }

    return this.repository.listAssets(tenantId, {
      ...options,
      partnerId: targetVendorId,
    })
  }

  async getAsset(tenantId: string, id: string, actor?: MediaActor): Promise<MediaAsset> {
    const asset = await this.repository.findAssetById(tenantId, id)
    if (!asset) {
      throw new AppError('Media asset not found', 404, 'media-not-found')
    }

    // Verify vendor ownership
    if (actor && !actor.isAdmin && !actor.isSuperAdmin) {
      if (asset.partnerId !== actor.activePartnerId) {
        throw new AppError('Unauthorized access to media asset', 403, 'forbidden')
      }
    }

    return asset
  }

  async deleteAsset(tenantId: string, id: string, actor?: MediaActor): Promise<void> {
    const asset = await this.getAsset(tenantId, id, actor)

    // Delete physical file from storage provider
    if (this.storage && asset.storagePath) {
      await this.storage.delete(tenantId, asset.storagePath)
    }

    // Delete database record
    await this.repository.deleteAsset(tenantId, id)
  }
}
