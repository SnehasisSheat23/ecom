const cleanSegment = (value: string) => value.replace(/^\/+|\/+$/g, '')

export const productImagePath = (tenantId: string, productId: string, filename: string) =>
  `/${cleanSegment(tenantId)}/products/${cleanSegment(productId)}/${cleanSegment(filename)}`

export const vendorImagePath = (tenantId: string, partnerId: string | null, filename: string) =>
  `/${cleanSegment(tenantId)}/vendors/${cleanSegment(partnerId ?? 'platform')}/${cleanSegment(filename)}`

export const vendorDocumentPath = (tenantId: string, partnerId: string, filename: string) =>
  `/${cleanSegment(tenantId)}/vendors/${cleanSegment(partnerId)}/documents/${cleanSegment(filename)}`

export const exportPath = (tenantId: string, exportId: string) =>
  `/${cleanSegment(tenantId)}/exports/${cleanSegment(exportId)}`

export const blogCoverImagePath = (tenantId: string, blogId: string, filename: string) =>
  `/${cleanSegment(tenantId)}/blogs/${cleanSegment(blogId)}/cover/${cleanSegment(filename)}`

export const blogInlineImagePath = (tenantId: string, blogId: string, filename: string) =>
  `/${cleanSegment(tenantId)}/blogs/${cleanSegment(blogId)}/inline/${cleanSegment(filename)}`

export const mediaAssetPath = (tenantId: string, partnerId: string | null, filename: string) =>
  `/${cleanSegment(tenantId)}/media/${cleanSegment(partnerId ?? 'platform')}/${Date.now()}-${cleanSegment(filename)}`
