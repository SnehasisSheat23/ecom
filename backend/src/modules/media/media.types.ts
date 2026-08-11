export interface MediaAsset {
  id: string
  tenantId: string
  partnerId: string | null
  url: string
  storagePath: string | null
  filename: string
  mimeType: string
  sizeBytes: number
  createdAt: Date
  updatedAt: Date
}

export interface ListMediaOptions {
  page?: number
  perPage?: number
  partnerId?: string | null
}
