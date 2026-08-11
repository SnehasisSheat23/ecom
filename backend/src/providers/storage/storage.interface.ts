export interface StorageProvider {
  upload(tenantId: string, path: string, file: Buffer, contentType: string): Promise<string>
  delete(tenantId: string, path: string): Promise<void>
  getSignedUrl(tenantId: string, path: string, expiresIn: number): Promise<string>
}
