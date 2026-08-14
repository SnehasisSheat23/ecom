import { createHmac, randomBytes } from 'node:crypto'

import { SignJWT, jwtVerify } from 'jose'

import { AppError } from './errors.js'
import { requireEnv } from './env.js'

export interface AuthTokenPayload {
  sub: string
  tenantId: string
  email: string | null
  activePartnerId: string | null
  tenantMode: 'SINGLE_VENDOR' | 'MULTI_VENDOR'
  type: 'access'
  exp: number
  iat: number
}

const secret = () => {
  return new TextEncoder().encode(requireEnv('APP_SECRET'))
}

export const hashToken = (value: string) =>
  createHmac('sha256', secret()).update(value).digest('hex')

export const createAccessToken = async ({
  customerId,
  tenantId,
  email,
  activePartnerId = null,
  tenantMode = 'SINGLE_VENDOR',
  ttlSeconds = 60 * 60 * 24, // 24 hours (up from 15 minutes)
}: {
  customerId: string
  tenantId: string
  email: string | null
  activePartnerId?: string | null
  tenantMode?: 'SINGLE_VENDOR' | 'MULTI_VENDOR'
  ttlSeconds?: number
}): Promise<string> => {
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({
    tenantId,
    email,
    activePartnerId,
    tenantMode,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(customerId)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(secret())
}

export const verifyAccessToken = async (token: string): Promise<AuthTokenPayload> => {
  try {
    const { payload } = await jwtVerify(token, secret())

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.tenantId !== 'string' ||
      (payload.email !== null && typeof payload.email !== 'string' && payload.email !== undefined) ||
      (payload.activePartnerId !== null && typeof payload.activePartnerId !== 'string' && payload.activePartnerId !== undefined) ||
      payload.type !== 'access' ||
      typeof payload.exp !== 'number' ||
      typeof payload.iat !== 'number'
    ) {
      throw new AppError('Invalid token', 401, 'invalid-token')
    }

    // Default to SINGLE_VENDOR for backward compatibility with tokens issued before this field existed
    const tenantMode =
      payload.tenantMode === 'MULTI_VENDOR' ? 'MULTI_VENDOR' : 'SINGLE_VENDOR'

    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      activePartnerId: payload.activePartnerId,
      tenantMode,
      type: 'access',
      exp: payload.exp,
      iat: payload.iat,
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('exp') || message.includes('expired')) {
      throw new AppError('Token expired', 401, 'token-expired')
    }

    throw new AppError('Invalid token', 401, 'invalid-token')
  }
}

export const createRefreshToken = () => randomBytes(48).toString('hex')
export const createOtp = () => String(Math.floor(100000 + Math.random() * 900000))
