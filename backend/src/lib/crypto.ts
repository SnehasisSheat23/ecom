import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { getOptionalEnv } from './env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

const getKey = (secret = getOptionalEnv('APP_SECRET')): Buffer => {
  if (!secret) {
    throw new Error('Missing required environment variable: APP_SECRET')
  }

  return createHash('sha256').update(secret).digest()
}

export const encryptJson = (payload: Record<string, string>, secret?: string): string => {
  const key = getKey(secret)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.')
}

export const decryptJson = (value: string, secret?: string): Record<string, string> => {
  const [ivEncoded, tagEncoded, encryptedEncoded] = value.split('.')
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('Encrypted payload format is invalid')
  }

  const key = getKey(secret)
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivEncoded, 'base64'))
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64')),
    decipher.final(),
  ]).toString('utf8')

  return JSON.parse(decrypted) as Record<string, string>
}

export const encryptText = (value: string, secret?: string): string => {
  return encryptJson({ value }, secret)
}

export const decryptText = (value: string, secret?: string): string => {
  return decryptJson(value, secret).value
}

// Edge-compatible password hashing using native Web Crypto API
const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16

export const hashPassword = async (password: string): Promise<string> => {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const passwordKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const hash = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  )

  const saltBase64 = Buffer.from(salt).toString('base64')
  const hashBase64 = Buffer.from(hash).toString('base64')

  return `$pbkdf2$${PBKDF2_ITERATIONS}$${saltBase64}$${hashBase64}`
}

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const parts = storedHash.split('$')
  if (parts.length !== 5 || parts[1] !== 'pbkdf2') {
    // Unsupported hash format
    return false
  }

  const iterations = parseInt(parts[2], 10)
  const salt = Buffer.from(parts[3], 'base64')
  const hash = Buffer.from(parts[4], 'base64')

  const passwordKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  )

  const derivedBuffer = Buffer.from(derivedBits)
  return derivedBuffer.equals(hash)
}
