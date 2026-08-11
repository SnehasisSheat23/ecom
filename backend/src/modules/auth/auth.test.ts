import { describe, expect, it, beforeEach } from 'vitest'
import { AuthService } from './auth.service.js'
import { AppError } from '../../lib/errors.js'

describe('AuthService', () => {
  let authService: AuthService
  let fakeDb: any

  beforeEach(() => {
    fakeDb = {
      select: () => fakeDb,
      from: () => fakeDb,
      where: () => fakeDb,
      limit: () => Promise.resolve([]),
      update: () => fakeDb,
      set: () => fakeDb,
      returning: () => Promise.resolve([]),
      insert: () => fakeDb,
      values: () => fakeDb,
    }
    authService = new AuthService(fakeDb)
  })

  it('returns default tenant auth config when none is saved in database', async () => {
    const config = await authService.getTenantAuthConfig('tenant-1')
    expect(config.tenantId).toBe('tenant-1')
    expect(config.enableEmailPassword).toBe(true)
    expect(config.enablePhoneOtp).toBe(false)
    expect(config.enableGoogleOAuth).toBe(false)
    expect(config.enableMagicLink).toBe(false)
    expect(config.primaryIdentifier).toBe('email')
  })

  it('asserts strategy allowed properly based on config', () => {
    const config = {
      id: 'cfg-1',
      tenantId: 'tenant-1',
      enableEmailPassword: true,
      enablePhoneOtp: false,
      enableGoogleOAuth: false,
      enableMagicLink: true,
      primaryIdentifier: 'email' as const,
    }

    expect(() => authService.assertStrategyAllowed(config, 'email')).not.toThrow()
    expect(() => authService.assertStrategyAllowed(config, 'magic_link')).not.toThrow()

    expect(() => authService.assertStrategyAllowed(config, 'phone_otp')).toThrowError(AppError)
    expect(() => authService.assertStrategyAllowed(config, 'google')).toThrowError(AppError)
  })
})
