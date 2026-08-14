import crypto from 'node:crypto'

/**
 * Secure password hashing using scrypt (Node.js built-in, no external C++ binaries needed)
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err)
      resolve(`${salt}:${derivedKey.toString('hex')}`)
    })
  })
}

/**
 * Timing-safe password verification
 */
export async function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!combinedHash || !combinedHash.includes(':')) {
      return resolve(false)
    }
    const [salt, key] = combinedHash.split(':')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false)
      const keyBuffer = Buffer.from(key, 'hex')
      if (keyBuffer.length !== derivedKey.length) {
        return resolve(false)
      }
      resolve(crypto.timingSafeEqual(keyBuffer, derivedKey))
    })
  })
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return Buffer.from(base64, 'base64').toString('utf8')
}

export interface JwtPayload {
  sub: string // User or Admin ID
  email: string
  role?: string
  type: 'admin' | 'customer'
  iat?: number
  exp?: number
  [key: string]: any
}

/**
 * Sign a standard HS256 JWT Token
 */
export function signJwt(payload: JwtPayload, secret: string, expiresInSeconds: number = 60 * 60 * 24 * 7): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

/**
 * Verify and decode an HS256 JWT Token
 */
export function verifyJwt<T = JwtPayload>(token: string, secret: string): T | null {
  try {
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [encodedHeader, encodedPayload, signature] = parts
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

    if (signature !== expectedSignature) {
      return null
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null // Expired
    }

    return payload as unknown as T
  } catch (err) {
    return null
  }
}
