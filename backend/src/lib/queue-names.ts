const queueName = (tenantId: string, suffix: string) => `tenant:${tenantId}:${suffix}`

export const cartAbandonmentQueue = (tenantId: string) => queueName(tenantId, 'cart-abandonment')
export const searchSyncQueue = (tenantId: string) => queueName(tenantId, 'search-sync')
export const notificationQueue = (tenantId: string) => queueName(tenantId, 'notifications')
export const inventoryReleaseQueue = (tenantId: string) => queueName(tenantId, 'inventory-release')
export const exportQueue = (tenantId: string) => queueName(tenantId, 'exports')
export const paymentFollowupQueue = (tenantId: string) => queueName(tenantId, 'payment-followup')
