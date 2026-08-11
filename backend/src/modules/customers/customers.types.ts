export interface Customer {
  id: string
  tenantId: string
  partnerId: string | null
  vendorId?: string | null
  supabaseAuthId: string | null
  email: string | null
  passwordHash: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatarUrl: string | null
  isAdmin: boolean
  emailVerifiedAt: Date | null
  lastLoginAt: Date | null
  gdprDeletionRequestedAt: Date | null
  tierId: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PartnerMembership {
  partnerId: string
  role: 'owner' | 'manager' | 'staff'
  status: 'onboarding' | 'active' | 'suspended'
}

export type VendorMembership = PartnerMembership

export interface AuthenticatedCustomer {
  customerId: string
  tenantId: string
  partnerMemberships: PartnerMembership[]
  activePartnerId: string | null
  email: string | null
  isAdmin: boolean
  isSuperAdmin: boolean
}

export interface Address {
  id: string
  tenantId: string
  customerId: string
  label: string | null
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  phone: string | null
  isDefaultShipping: boolean
  isDefaultBilling: boolean
  createdAt: Date
  updatedAt: Date
}

export interface GuestSession {
  id: string
  tenantId: string
  cartId: string | null
  expiresAt: Date
  createdAt: Date
}

export interface RefreshTokenRecord {
  id: string
  tenantId: string
  customerId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  createdAt: Date
}

export interface PasswordResetToken {
  id: string
  tenantId: string
  customerId: string
  otpHash: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export interface RegisterInput {
  email: string
  password: string
  firstName?: string
  lastName?: string
  guestSessionId?: string
}

export interface LoginInput {
  email: string
  password?: string
  phone?: string
  guestSessionId?: string
  items?: { variantId: string; quantity: number; metadata?: Record<string, any> }[]
}

export interface AuthenticateInput {
  email: string
  phone: string
  guestSessionId?: string
  items?: { variantId: string; quantity: number; metadata?: Record<string, any> }[]
}

export interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  phone?: string | null
  avatarUrl?: string | null
}

export interface CreateAddressInput {
  label?: string
  line1: string
  line2?: string | null
  city: string
  state: string
  postalCode: string
  country?: string
  phone?: string | null
  isDefaultShipping?: boolean
  isDefaultBilling?: boolean
}

export interface UpdateAddressInput extends Partial<CreateAddressInput> {}

export interface AuthResult {
  customer: Customer
  accessToken: string
  refreshToken: string
}

export type PublicCustomer = Omit<Customer, 'passwordHash' | 'deletedAt'>

export function toPublicCustomer(customer: Customer): PublicCustomer {
  const { passwordHash, deletedAt, ...publicCustomer } = customer
  return publicCustomer
}

export interface CustomerListFilters {
  page?: number
  perPage?: number
  search?: string
}

export interface PaginatedCustomersResult<T = Customer> {
  items: T[]
  page: number
  perPage: number
  total: number
}
