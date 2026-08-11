import { isSuperAdminEmail } from '../../lib/admin.js'
import { logger } from '../../lib/logger.js'
import { createAccessToken, createOtp, createRefreshToken, hashToken, type AuthTokenPayload } from '../../lib/auth.js'
import { hashPassword, verifyPassword } from '../../lib/crypto.js'
import { AppError } from '../../lib/errors.js'
import { NoopGuestCartMerger, type GuestCartMerger } from './customers.cart.js'
import { GoogleAuthTokenVerifier, type GoogleTokenVerifier } from './customers.google.js'
import type { TenancyService } from '../../layers/tenancy/tenancy.service.js'
import {
  AddressRepository,
  CustomerRepository,
  GuestSessionRepository,
  PasswordResetRepository,
  RefreshTokenRepository,
} from './customers.repository.js'
import type {
  Address,
  AuthenticatedCustomer,
  AuthenticateInput,
  AuthResult,
  CreateAddressInput,
  Customer,
  CustomerListFilters,
  GuestSession,
  LoginInput,
  PaginatedCustomersResult,
  RegisterInput,
  UpdateAddressInput,
  UpdateProfileInput,
} from './customers.types.js'

const REFRESH_TTL_DAYS = 30
const GUEST_TTL_DAYS = 30
const PASSWORD_RESET_MINUTES = 15
const DUMMY_HASH =
  '$pbkdf2$100000$MzZkNGEwOGU5YTNmNDQwZQ$YjFmOGU5YTNmNDQwZTM2ZDRhMDhlOWEzZjQ0MGVlYjE'

/** Strip whitespace, dashes, and parens so "+91 99999 99999" === "+919999999999" */
const normalizePhone = (raw: string): string => raw.replace(/[\s\-\(\)]/g, '')

export class CustomersService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly addresses: AddressRepository,
    private readonly guestSessions: GuestSessionRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwordResets: PasswordResetRepository,
    private readonly googleVerifier?: GoogleTokenVerifier,
    private readonly guestCartMerger: GuestCartMerger = new NoopGuestCartMerger(),
    private readonly tenancyService?: TenancyService,
  ) {}

  async register(
    data: RegisterInput,
    tenantId: string,
    tenantMode: AuthTokenPayload['tenantMode'] = 'SINGLE_VENDOR',
  ): Promise<AuthResult> {
    const existing = await this.customers.findByEmail(tenantId, data.email)
    if (existing && !existing.deletedAt) {
      throw new AppError('Customer already exists', 409, 'customer-email-conflict')
    }

    const passwordHash = await hashPassword(data.password)
    const customer =
      existing && existing.deletedAt
        ? await this.customers.update(tenantId, existing.id, {
            deletedAt: null,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email.toLowerCase(),
          })
        : await this.customers.create({
            tenantId,
            email: data.email.toLowerCase(),
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            isAdmin: isSuperAdminEmail(data.email),
          })

    if (this.tenancyService) {
      try {
        await this.tenancyService.incrementStats(tenantId, { totalCustomers: 1 })
      } catch (err) {
        logger.error({ err, tenantId }, 'Failed to increment customer count stats')
      }
    }

    const tokens = await this.issueTokens(customer.id, customer.tenantId, customer.email, null, tenantMode)
    if (data.guestSessionId) {
      await this.mergeGuestToCustomer(data.guestSessionId, customer.id, tenantId)
    }
    return { customer, ...tokens }
  }

  async login(
    data: LoginInput,
    tenantId: string,
    tenantMode: AuthTokenPayload['tenantMode'] = 'SINGLE_VENDOR',
  ): Promise<AuthResult> {
    const customer = await this.customers.findByEmail(tenantId, data.email)
    const hash = customer?.passwordHash ?? DUMMY_HASH
    if (!data.password) {
      throw new AppError('Password required', 400, 'invalid-request')
    }
    const passwordMatches = await verifyPassword(data.password, hash)

    if (!customer || customer.deletedAt || !passwordMatches) {
      throw new AppError('Invalid credentials', 401, 'invalid-credentials')
    }

    const updated = await this.customers.update(tenantId, customer.id, { lastLoginAt: new Date() })

    // Single-shot sync if items provided
    if (data.items && data.items.length > 0) {
      await this.guestCartMerger.syncItems(tenantId, { customerId: updated.id }, data.items)
    }

    const tokens = await this.issueTokens(updated.id, updated.tenantId, updated.email, null, tenantMode)
    if (data.guestSessionId) {
      await this.mergeGuestToCustomer(data.guestSessionId, updated.id, tenantId)
    }
    return { customer: updated, ...tokens }
  }

  async authenticate(
    data: AuthenticateInput,
    tenantId: string,
    tenantMode: AuthTokenPayload['tenantMode'] = 'SINGLE_VENDOR',
  ): Promise<AuthResult> {
    const phone = normalizePhone(data.phone)
    let customer = await this.customers.findByEmail(tenantId, data.email)

    if (customer) {
      if (customer.deletedAt) {
        throw new AppError('Account deactivated', 403, 'customer-deactivated')
      }
      // If user exists, verify phone matches (if they have one)
      if (customer.phone && normalizePhone(customer.phone) !== phone) {
        throw new AppError('Incorrect phone number for this account', 401, 'invalid-credentials')
      }
      // If they don't have a phone recorded, link it now
      if (!customer.phone) {
        customer = await this.customers.update(tenantId, customer.id, { phone })
      }
    } else {
      // Check if phone is already used by another email
      const byPhone = await this.customers.findByPhone(tenantId, phone)
      if (byPhone) {
        throw new AppError('Phone number already in use by another account', 409, 'customer-phone-conflict')
      }

      // Create new account automatically
      customer = await this.customers.create({
        tenantId,
        email: data.email.toLowerCase(),
        phone,
        firstName: data.email.split('@')[0], // Use email prefix as name
        isAdmin: isSuperAdminEmail(data.email),
      })

      if (this.tenancyService) {
        try {
          await this.tenancyService.incrementStats(tenantId, { totalCustomers: 1 })
        } catch (err) {
          logger.error({ err, tenantId }, 'Failed to increment auto-customer count stats')
        }
      }
    }

    const updated = await this.customers.update(tenantId, customer.id, { lastLoginAt: new Date() })

    // Single-shot sync if items provided
    if (data.items && data.items.length > 0) {
      await this.guestCartMerger.syncItems(tenantId, { customerId: updated.id }, data.items)
    }

    const tokens = await this.issueTokens(updated.id, updated.tenantId, updated.email, null, tenantMode)
    
    if (data.guestSessionId) {
      await this.mergeGuestToCustomer(data.guestSessionId, updated.id, tenantId)
    }
    
    return { customer: updated, ...tokens }
  }

  async refreshToken(
    token: string,
    tenantId: string,
    tenantMode: AuthTokenPayload['tenantMode'] = 'SINGLE_VENDOR',
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const oldHash = hashToken(token)
    const record = await this.refreshTokens.findActive(tenantId, oldHash)
    if (!record) {
      throw new AppError('Refresh token expired', 401, 'refresh-token-expired')
    }

    const customer = await this.customers.findById(tenantId, record.customerId)
    if (!customer || customer.deletedAt) {
      throw new AppError('Invalid credentials', 401, 'invalid-credentials')
    }

    // Rotate: revoke old token, issue fresh pair
    await this.refreshTokens.revoke(tenantId, oldHash)
    return this.issueTokens(customer.id, customer.tenantId, customer.email, null, tenantMode)
  }

  async logout(refreshToken: string, tenantId: string): Promise<void> {
    await this.refreshTokens.revoke(tenantId, hashToken(refreshToken))
  }

  async requestPasswordReset(email: string, tenantId: string): Promise<{ otp: string | null }> {
    const customer = await this.customers.findByEmail(tenantId, email)
    if (!customer || customer.deletedAt) {
      return { otp: null }
    }

    const otp = createOtp()
    await this.passwordResets.create({
      tenantId,
      customerId: customer.id,
      otpHash: hashToken(otp),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000),
    })
    return { otp }
  }

  async confirmPasswordReset(
    email: string,
    otp: string,
    newPassword: string,
    tenantId: string,
  ): Promise<void> {
    const customer = await this.customers.findByEmail(tenantId, email)
    if (!customer || customer.deletedAt) {
      throw new AppError('Invalid password reset request', 401, 'invalid-password-reset')
    }

    const token = await this.passwordResets.findActive(tenantId, customer.id, hashToken(otp))
    if (!token) {
      throw new AppError('Invalid password reset request', 401, 'invalid-password-reset')
    }

    await this.passwordResets.markUsed(tenantId, customer.id, token.id)
    await this.customers.update(tenantId, customer.id, {
      passwordHash: await hashPassword(newPassword),
    })
  }

  async googleOAuth(
    payload: { supabaseToken: string },
    tenantId: string,
    tenantMode: AuthTokenPayload['tenantMode'] = 'SINGLE_VENDOR',
  ): Promise<AuthResult> {
    const verifier = this.googleVerifier ?? new GoogleAuthTokenVerifier()
    const profile = await verifier.verifyIdToken(payload.supabaseToken)
    const bySupabase = await this.customers.findBySupabaseId(tenantId, profile.supabaseAuthId)
    const byEmail = await this.customers.findByEmail(tenantId, profile.email)
    const customer =
      bySupabase ??
      byEmail ??
      (await this.customers.create({
        tenantId,
        email: profile.email.toLowerCase(),
        firstName: profile.firstName,
        lastName: profile.lastName,
        supabaseAuthId: profile.supabaseAuthId,
        isAdmin: isSuperAdminEmail(profile.email),
        emailVerifiedAt: new Date(),
      }))

    const linked =
      customer.supabaseAuthId === profile.supabaseAuthId
        ? customer
        : await this.customers.update(tenantId, customer.id, {
            supabaseAuthId: profile.supabaseAuthId,
            isAdmin: customer.isAdmin || isSuperAdminEmail(profile.email),
            emailVerifiedAt: customer.emailVerifiedAt ?? new Date(),
          })

    const tokens = await this.issueTokens(linked.id, linked.tenantId, linked.email, null, tenantMode)
    return { customer: linked, ...tokens }
  }

  async getProfile(customerId: string, tenantId: string) {
    const customer = await this.customers.findById(tenantId, customerId)
    if (!customer || customer.deletedAt) {
      throw new AppError('Customer not found', 404, 'customer-not-found')
    }
    return customer
  }

  async updateProfile(customerId: string, tenantId: string, data: UpdateProfileInput) {
    return this.customers.update(tenantId, customerId, data)
  }

  async listCustomers(
    tenantId: string,
    filters?: CustomerListFilters,
  ): Promise<PaginatedCustomersResult<Customer>> {
    return this.customers.list(tenantId, filters)
  }

  async getAuthenticatedCustomer(
    customerId: string,
    tenantId: string,
    requestedActiveVendorId: string | null = null,
  ): Promise<AuthenticatedCustomer> {
    let customer: Customer
    let partnerMemberships: any[] = []
    try {
      ;[customer, partnerMemberships] = await Promise.all([
        this.getProfile(customerId, tenantId),
        this.customers.listVendorMemberships(tenantId, customerId),
      ])
    } catch (err) {
      if (err instanceof AppError && err.code === 'customer-not-found') {
        throw new AppError('Invalid or expired token', 401, 'invalid-token')
      }
      throw err
    }
    
    const activePartnerId = this.resolveActiveVendorId(partnerMemberships, requestedActiveVendorId)
    const isSuperAdmin = customer.email ? isSuperAdminEmail(customer.email) : false
    const isAdmin = customer.isAdmin || isSuperAdmin

    return {
      customerId: customer.id,
      tenantId: customer.tenantId,
      partnerMemberships,
      activePartnerId,
      email: customer.email,
      isAdmin,
      isSuperAdmin,
    }
  }

  async setActiveVendor(
    customerId: string,
    tenantId: string,
    partnerId: string | null,
    tenantMode: AuthTokenPayload['tenantMode'] = 'SINGLE_VENDOR',
  ): Promise<{ customer: AuthenticatedCustomer; accessToken: string }> {
    const customer = await this.getAuthenticatedCustomer(customerId, tenantId, partnerId)

    return {
      customer,
      accessToken: await createAccessToken({
        customerId: customer.customerId,
        tenantId: customer.tenantId,
        email: customer.email,
        activePartnerId: customer.activePartnerId,
        tenantMode,
      }),
    }
  }

  async createGuestSession(tenantId: string): Promise<GuestSession> {
    return this.guestSessions.create(tenantId, {
      expiresAt: new Date(Date.now() + GUEST_TTL_DAYS * 24 * 60 * 60 * 1000),
    })
  }

  async mergeGuestToCustomer(guestSessionId: string, customerId: string, tenantId: string): Promise<void> {
    const session = await this.guestSessions.findById(tenantId, guestSessionId)
    if (session) {
      await this.guestCartMerger.mergeGuestCartIntoCustomer({
        tenantId: session.tenantId,
        guestSessionId,
        customerId,
      })
      await this.guestCartMerger.unlinkGuestSession(tenantId, guestSessionId)
      await this.guestSessions.delete(tenantId, guestSessionId)
    }
  }

  async listAddresses(customerId: string, tenantId: string): Promise<Address[]> {
    return this.addresses.findByCustomer(tenantId, customerId)
  }

  async createAddress(customerId: string, tenantId: string, data: CreateAddressInput): Promise<Address> {
    if ((await this.addresses.countByCustomer(tenantId, customerId)) >= 10) {
      throw new AppError('Address limit reached', 400, 'address-limit-reached')
    }

    if (data.isDefaultShipping) {
      await this.addresses.clearDefaultShipping(tenantId, customerId)
    }
    if (data.isDefaultBilling) {
      await this.addresses.clearDefaultBilling(tenantId, customerId)
    }

    return this.addresses.create({
      tenantId,
      customerId,
      label: data.label,
      line1: data.line1,
      line2: data.line2,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country ?? 'IN',
      phone: data.phone,
      isDefaultShipping: data.isDefaultShipping ?? false,
      isDefaultBilling: data.isDefaultBilling ?? false,
    })
  }

  async updateAddress(
    addressId: string,
    customerId: string,
    tenantId: string,
    data: UpdateAddressInput,
  ): Promise<Address> {
    const address = await this.addresses.findById(tenantId, addressId, customerId)
    if (!address) {
      throw new AppError('Address not found', 404, 'address-not-found')
    }

    if (data.isDefaultShipping) {
      await this.addresses.clearDefaultShipping(tenantId, customerId)
    }
    if (data.isDefaultBilling) {
      await this.addresses.clearDefaultBilling(tenantId, customerId)
    }

    return this.addresses.update(tenantId, addressId, data)
  }

  async deleteAddress(addressId: string, customerId: string, tenantId: string): Promise<void> {
    const address = await this.addresses.findById(tenantId, addressId, customerId)
    if (!address) {
      throw new AppError('Address not found', 404, 'address-not-found')
    }
    await this.addresses.delete(tenantId, addressId)
  }

  private async issueTokens(
    customerId: string,
    tenantId: string,
    email: string | null,
    activePartnerId: string | null = null,
    tenantMode: AuthTokenPayload['tenantMode'] = 'SINGLE_VENDOR',
  ) {
    const accessToken = await createAccessToken({ customerId, tenantId, email, activePartnerId, tenantMode })
    const refreshToken = createRefreshToken()
    await this.refreshTokens.create({
      tenantId,
      customerId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    })
    return { accessToken, refreshToken }
  }

  private resolveActiveVendorId(
    memberships: AuthenticatedCustomer['partnerMemberships'],
    requestedActiveVendorId: string | null,
  ): string | null {
    if (requestedActiveVendorId === null) {
      return null
    }

    const membership = memberships.find((entry) => entry.partnerId === requestedActiveVendorId)
    
    if (!membership || membership.status !== 'active') {
      const status = membership?.status
      if (status === 'suspended') {
        throw new AppError('Your vendor account has been suspended', 403, 'vendor-suspended')
      }
      if (status === 'onboarding') {
        throw new AppError('Your vendor application is still under review', 403, 'vendor-onboarding')
      }
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    return membership.partnerId
  }
}
