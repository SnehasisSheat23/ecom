import { describe, expect, it, vi } from 'vitest'

import type { GuestCartMerger } from './customers.cart.js'
import type { GoogleTokenVerifier } from './customers.google.js'
import { CustomersService } from './customers.service.js'
import { toPublicCustomer, type Address, type Customer, type GuestSession } from './customers.types.js'
import type {
  AddressRepository,
  CustomerRepository,
  GuestSessionRepository,
  PasswordResetRepository,
  RefreshTokenRepository,
} from './customers.repository.js'

process.env.APP_SECRET = 'test-secret'

const customerFixture: Customer = {
  id: 'cust-1',
  tenantId: 'tenant-1',
  partnerId: null,
  supabaseAuthId: null,
  email: 'customer@example.com',
  passwordHash: '$2b$12$3euPcmQFCiblsZeEu5s7pOoYJ0Z7LxyzKDn5XxhxL7sRKqzZo4PM2',
  firstName: 'Test',
  lastName: 'User',
  phone: null,
  avatarUrl: null,
  isAdmin: false,
  emailVerifiedAt: null,
  lastLoginAt: null,
  gdprDeletionRequestedAt: null,
  tierId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const addressFixture: Address = {
  id: 'addr-1',
  tenantId: 'tenant-1',
  customerId: 'cust-1',
  label: 'Home',
  line1: 'Line 1',
  line2: null,
  city: 'Kolkata',
  state: 'WB',
  postalCode: '700001',
  country: 'IN',
  phone: null,
  isDefaultShipping: false,
  isDefaultBilling: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const guestFixture: GuestSession = {
  id: 'guest-1',
  tenantId: 'tenant-1',
  cartId: null,
  expiresAt: new Date(),
  createdAt: new Date(),
}

const buildService = () => {
  const customers = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findBySupabaseId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    listVendorMemberships: vi.fn().mockResolvedValue([]),
  } as unknown as CustomerRepository
  const addresses = {
    findByCustomer: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countByCustomer: vi.fn(),
    clearDefaultShipping: vi.fn(),
    clearDefaultBilling: vi.fn(),
  } as unknown as AddressRepository
  const guests = {
    create: vi.fn(),
    findById: vi.fn(),
    linkCart: vi.fn(),
    delete: vi.fn(),
    deleteExpired: vi.fn(),
  } as unknown as GuestSessionRepository
  const refresh = {
    create: vi.fn(),
    findActive: vi.fn(),
    revoke: vi.fn(),
  } as unknown as RefreshTokenRepository
  const resets = {
    create: vi.fn(),
    findActive: vi.fn(),
    markUsed: vi.fn(),
  } as unknown as PasswordResetRepository
  const googleVerifier: GoogleTokenVerifier = {
    verifyIdToken: vi.fn(),
  }
  const guestCartMerger: GuestCartMerger = {
    mergeGuestCartIntoCustomer: vi.fn(),
    unlinkGuestSession: vi.fn(),
    syncItems: vi.fn(),
  }

  return {
    service: new CustomersService(
      customers,
      addresses,
      guests,
      refresh,
      resets,
      googleVerifier,
      guestCartMerger,
    ),
    customers,
    addresses,
    guests,
    refresh,
    resets,
    googleVerifier,
    guestCartMerger,
  }
}

describe('CustomersService', () => {
  it('registers a customer', async () => {
    const { service, customers, refresh } = buildService()
    vi.mocked(customers.findByEmail).mockResolvedValue(null)
    vi.mocked(customers.create).mockResolvedValue(customerFixture)
    vi.mocked(refresh.create).mockResolvedValue({
      id: 'rt-1',
      tenantId: 'tenant-1',
      customerId: 'cust-1',
      tokenHash: 'hash',
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    })

    const result = await service.register(
      { email: 'customer@example.com', password: 'password123' },
      'tenant-1',
    )

    expect(result.customer.id).toBe('cust-1')
    expect(result.accessToken).toBeTruthy()
  })

  it('allows same email in different tenants via repository lookups', async () => {
    const { service, customers, refresh } = buildService()
    vi.mocked(customers.findByEmail).mockResolvedValue(null)
    vi.mocked(customers.create).mockResolvedValue({ ...customerFixture, tenantId: 'tenant-2' })
    vi.mocked(refresh.create).mockResolvedValue({
      id: 'rt-1',
      tenantId: 'tenant-2',
      customerId: 'cust-1',
      tokenHash: 'hash',
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    })

    const result = await service.register(
      { email: 'customer@example.com', password: 'password123' },
      'tenant-2',
    )

    expect(result.customer.tenantId).toBe('tenant-2')
  })

  it('blocks login for soft-deleted customers', async () => {
    const { service, customers } = buildService()
    vi.mocked(customers.findByEmail).mockResolvedValue({ ...customerFixture, deletedAt: new Date() })

    await expect(
      service.login({ email: 'customer@example.com', password: 'password123' }, 'tenant-1'),
    ).rejects.toMatchObject({ code: 'invalid-credentials' })
  })

  it('enforces max 10 addresses', async () => {
    const { service, addresses } = buildService()
    vi.mocked(addresses.countByCustomer).mockResolvedValue(10)

    await expect(
      service.createAddress('cust-1', 'tenant-1', {
        line1: 'Line 1',
        city: 'City',
        state: 'State',
        postalCode: '123',
      }),
    ).rejects.toMatchObject({ code: 'address-limit-reached' })
  })

  it('toggles default address flags before create', async () => {
    const { service, addresses } = buildService()
    vi.mocked(addresses.countByCustomer).mockResolvedValue(0)
    vi.mocked(addresses.create).mockResolvedValue({ ...addressFixture, isDefaultShipping: true })

    await service.createAddress('cust-1', 'tenant-1', {
      line1: 'Line 1',
      city: 'City',
      state: 'State',
      postalCode: '123',
      isDefaultShipping: true,
    })

    expect(vi.mocked(addresses.clearDefaultShipping)).toHaveBeenCalledWith('tenant-1', 'cust-1')
  })

  it('creates guest sessions', async () => {
    const { service, guests } = buildService()
    vi.mocked(guests.create).mockResolvedValue(guestFixture)

    const result = await service.createGuestSession('tenant-1')

    expect(result.id).toBe('guest-1')
  })

  it('uses the guest cart merger when linking a guest session', async () => {
    const { service, guests, guestCartMerger } = buildService()
    vi.mocked(guests.findById).mockResolvedValue(guestFixture)

    await service.mergeGuestToCustomer('guest-1', 'cust-1', 'tenant-1')

    expect(vi.mocked(guestCartMerger.mergeGuestCartIntoCustomer)).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      guestSessionId: 'guest-1',
      customerId: 'cust-1',
    })
    expect(vi.mocked(guests.delete)).toHaveBeenCalledWith('tenant-1', 'guest-1')
  })

  it('links google auth through the verifier', async () => {
    const { service, customers, refresh, googleVerifier } = buildService()
    vi.mocked(googleVerifier.verifyIdToken).mockResolvedValue({
      email: 'google@example.com',
      supabaseAuthId: 'google-sub',
      firstName: 'Go',
      lastName: 'Ogle',
    })
    vi.mocked(customers.findBySupabaseId).mockResolvedValue(null)
    vi.mocked(customers.findByEmail).mockResolvedValue(null)
    vi.mocked(customers.create).mockResolvedValue({
      ...customerFixture,
      email: 'google@example.com',
      supabaseAuthId: 'google-sub',
    })
    vi.mocked(refresh.create).mockResolvedValue({
      id: 'rt-1',
      tenantId: 'tenant-1',
      customerId: 'cust-1',
      tokenHash: 'hash',
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    })

    const result = await service.googleOAuth({ supabaseToken: 'google-id-token' }, 'tenant-1')

    expect(result.customer.supabaseAuthId).toBe('google-sub')
    expect(vi.mocked(googleVerifier.verifyIdToken)).toHaveBeenCalledWith('google-id-token')
  })

  it('hydrates authenticated customer context with memberships and active vendor', async () => {
    const { service, customers } = buildService()
    vi.mocked(customers.findById).mockResolvedValue(customerFixture)
    vi.mocked(customers.listVendorMemberships).mockResolvedValue([
      { partnerId: 'vendor-1', role: 'staff', status: 'active' },
      { partnerId: 'vendor-2', role: 'manager', status: 'suspended' },
    ])

    const result = await service.getAuthenticatedCustomer('cust-1', 'tenant-1', 'vendor-1')

    expect(result.activePartnerId).toBe('vendor-1')
    expect(result.partnerMemberships).toHaveLength(2)
  })

  it('rejects switching to a vendor outside the caller memberships', async () => {
    const { service, customers } = buildService()
    vi.mocked(customers.findById).mockResolvedValue(customerFixture)
    vi.mocked(customers.listVendorMemberships).mockResolvedValue([
      { partnerId: 'vendor-1', role: 'staff', status: 'active' },
    ])

    await expect(service.setActiveVendor('cust-1', 'tenant-1', 'vendor-2')).rejects.toMatchObject({
      code: 'forbidden',
    })
  })

  describe('toPublicCustomer', () => {
    it('strips passwordHash and deletedAt from the customer object', () => {
      const publicCustomer = toPublicCustomer(customerFixture)
      
      expect(publicCustomer).not.toHaveProperty('passwordHash')
      expect(publicCustomer).not.toHaveProperty('deletedAt')
      expect(publicCustomer.id).toBe(customerFixture.id)
      expect(publicCustomer.email).toBe(customerFixture.email)
    })
  })
})

