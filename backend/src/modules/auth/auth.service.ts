import { eq } from 'drizzle-orm'
import type { Database } from '../../lib/db.js'
import { tenantAuthConfig } from './auth.schema.js'
import { AppError } from '../../lib/errors.js'

export interface TenantAuthConfig {
  id: string
  tenantId: string
  enableEmailPassword: boolean
  enablePhoneOtp: boolean
  enableGoogleOAuth: boolean
  enableMagicLink: boolean
  primaryIdentifier: 'email' | 'phone'
}

export interface UpdateTenantAuthConfigInput {
  enableEmailPassword?: boolean
  enablePhoneOtp?: boolean
  enableGoogleOAuth?: boolean
  enableMagicLink?: boolean
  primaryIdentifier?: 'email' | 'phone'
}

export class AuthService {
  constructor(private readonly db: Database) {}

  async getTenantAuthConfig(tenantId: string): Promise<TenantAuthConfig> {
    const [config] = await this.db
      .select()
      .from(tenantAuthConfig)
      .where(eq(tenantAuthConfig.tenantId, tenantId))
      .limit(1)

    if (!config) {
      // Default fallback config if tenant has no custom row yet
      return {
        id: 'default',
        tenantId,
        enableEmailPassword: true,
        enablePhoneOtp: false,
        enableGoogleOAuth: false,
        enableMagicLink: false,
        primaryIdentifier: 'email',
      }
    }

    return {
      id: config.id,
      tenantId: config.tenantId,
      enableEmailPassword: config.enableEmailPassword,
      enablePhoneOtp: config.enablePhoneOtp,
      enableGoogleOAuth: config.enableGoogleOAuth,
      enableMagicLink: config.enableMagicLink,
      primaryIdentifier: config.primaryIdentifier,
    }
  }

  async updateTenantAuthConfig(
    tenantId: string,
    input: UpdateTenantAuthConfigInput,
  ): Promise<TenantAuthConfig> {
    const [existing] = await this.db
      .select()
      .from(tenantAuthConfig)
      .where(eq(tenantAuthConfig.tenantId, tenantId))
      .limit(1)

    if (existing) {
      const [updated] = await this.db
        .update(tenantAuthConfig)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(tenantAuthConfig.tenantId, tenantId))
        .returning()

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        enableEmailPassword: updated.enableEmailPassword,
        enablePhoneOtp: updated.enablePhoneOtp,
        enableGoogleOAuth: updated.enableGoogleOAuth,
        enableMagicLink: updated.enableMagicLink,
        primaryIdentifier: updated.primaryIdentifier,
      }
    }

    const [created] = await this.db
      .insert(tenantAuthConfig)
      .values({
        tenantId,
        enableEmailPassword: input.enableEmailPassword ?? true,
        enablePhoneOtp: input.enablePhoneOtp ?? false,
        enableGoogleOAuth: input.enableGoogleOAuth ?? false,
        enableMagicLink: input.enableMagicLink ?? false,
        primaryIdentifier: input.primaryIdentifier ?? 'email',
      })
      .returning()

    return {
      id: created.id,
      tenantId: created.tenantId,
      enableEmailPassword: created.enableEmailPassword,
      enablePhoneOtp: created.enablePhoneOtp,
      enableGoogleOAuth: created.enableGoogleOAuth,
      enableMagicLink: created.enableMagicLink,
      primaryIdentifier: created.primaryIdentifier,
    }
  }

  assertStrategyAllowed(config: TenantAuthConfig, strategy: 'email' | 'phone_otp' | 'google' | 'magic_link'): void {
    switch (strategy) {
      case 'email':
        if (!config.enableEmailPassword) {
          throw new AppError('Email/password login is disabled for this store', 400, 'auth-method-disabled')
        }
        break
      case 'phone_otp':
        if (!config.enablePhoneOtp) {
          throw new AppError('Phone OTP login is disabled for this store', 400, 'auth-method-disabled')
        }
        break
      case 'google':
        if (!config.enableGoogleOAuth) {
          throw new AppError('Google OAuth login is disabled for this store', 400, 'auth-method-disabled')
        }
        break
      case 'magic_link':
        if (!config.enableMagicLink) {
          throw new AppError('Magic link login is disabled for this store', 400, 'auth-method-disabled')
        }
        break
    }
  }
}
