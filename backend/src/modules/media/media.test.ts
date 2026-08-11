import { describe, expect, it, vi } from 'vitest'
import { MediaService, type MediaActor } from './media.service.js'
import type { MediaRepository } from './media.repository.js'
import type { MediaAsset } from './media.types.js'

const mediaAssetFixture: MediaAsset = {
  id: 'media-1',
  tenantId: 'tenant-1',
  partnerId: null,
  url: 'http://example.com/file.jpg',
  storagePath: '/tenant-1/media/platform/file.jpg',
  filename: 'file.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const vendorActor: MediaActor = {
  customerId: 'cust-1',
  tenantId: 'tenant-1',
  activePartnerId: 'vendor-1',
  isAdmin: false,
  isSuperAdmin: false,
}

const adminActor: MediaActor = {
  customerId: 'admin-1',
  tenantId: 'tenant-1',
  activePartnerId: null,
  isAdmin: true,
  isSuperAdmin: false,
}

const buildRepository = () =>
  ({
    createAsset: vi.fn().mockResolvedValue(mediaAssetFixture),
    findAssetById: vi.fn().mockResolvedValue(mediaAssetFixture),
    listAssets: vi.fn().mockResolvedValue({ items: [mediaAssetFixture], total: 1, page: 1, perPage: 20 }),
    deleteAsset: vi.fn(),
  }) as unknown as MediaRepository

const buildStorageProvider = () => ({
  upload: vi.fn().mockResolvedValue('http://example.com/uploaded.jpg'),
  delete: vi.fn().mockResolvedValue(undefined),
})

describe('MediaService', () => {
  it('uploads a media asset successfully', async () => {
    const repository = buildRepository()
    const storage = buildStorageProvider()
    const service = new MediaService(repository, storage as any)

    const content = Buffer.from('mock-file-content')
    const result = await service.uploadAsset(
      'tenant-1',
      null,
      'file.jpg',
      'image/jpeg',
      content,
      adminActor,
    )

    expect(storage.upload).toHaveBeenCalled()
    expect(repository.createAsset).toHaveBeenCalledWith('tenant-1', {
      partnerId: null,
      url: 'http://example.com/uploaded.jpg',
      storagePath: expect.any(String),
      filename: 'file.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: content.length,
    })
    expect(result.id).toBe('media-1')
  })

  it('restricts listing assets to active vendor context', async () => {
    const repository = buildRepository()
    const service = new MediaService(repository)

    await service.listAssets('tenant-1', { page: 1, perPage: 20 }, vendorActor)

    expect(repository.listAssets).toHaveBeenCalledWith('tenant-1', {
      page: 1,
      perPage: 20,
      partnerId: 'vendor-1',
    })
  })

  it('restricts deleting asset of a different vendor', async () => {
    const repository = buildRepository()
    const service = new MediaService(repository)
    
    const otherVendorAsset = { ...mediaAssetFixture, partnerId: 'vendor-2' }
    vi.mocked(repository.findAssetById).mockResolvedValue(otherVendorAsset)

    await expect(
      service.deleteAsset('tenant-1', 'media-1', vendorActor)
    ).rejects.toThrowError('Unauthorized access to media asset')
  })

  it('allows admins to delete any asset', async () => {
    const repository = buildRepository()
    const storage = buildStorageProvider()
    const service = new MediaService(repository, storage as any)

    const vendorAsset = { ...mediaAssetFixture, partnerId: 'vendor-1' }
    vi.mocked(repository.findAssetById).mockResolvedValue(vendorAsset)

    await service.deleteAsset('tenant-1', 'media-1', adminActor)

    expect(storage.delete).toHaveBeenCalledWith('tenant-1', vendorAsset.storagePath)
    expect(repository.deleteAsset).toHaveBeenCalledWith('tenant-1', 'media-1')
  })
})
