export type UserRole = 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'TENANT_STAFF'

export type PartnerRole = 'owner' | 'manager' | 'staff'

export type PartnerType = 'SELLER' | 'FULFILLMENT' | 'SUPPLIER' | 'HYBRID'

export type PartnerStatus = 'onboarding' | 'active' | 'suspended'

export type TenantMode = 'SINGLE_VENDOR' | 'MULTI_VENDOR'

export type DeploymentMode = 'saas' | 'standalone'

export type AuthStrategy = 'email' | 'phone_otp' | 'google' | 'magic_link'
