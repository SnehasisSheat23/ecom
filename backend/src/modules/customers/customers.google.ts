import { createRemoteJWKSet, jwtVerify } from 'jose'
import { getOptionalEnv } from '../../lib/env.js'
import { AppError } from '../../lib/errors.js'

export interface VerifiedGoogleProfile {
  email: string
  supabaseAuthId: string
  firstName?: string
  lastName?: string
}

export interface GoogleTokenVerifier {
  verifyIdToken(idToken: string): Promise<VerifiedGoogleProfile>
}

// Google rotates its public keys. We fetch them from their JWKS endpoint.
// jose handles caching and rotation automatically.
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

export class GoogleAuthTokenVerifier implements GoogleTokenVerifier {
  private readonly audience: string

  constructor(audience = getOptionalEnv('GOOGLE_CLIENT_ID')) {
    if (!audience) {
      throw new Error('Missing required environment variable: GOOGLE_CLIENT_ID')
    }
    this.audience = audience
  }

  async verifyIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
    try {
      const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: this.audience,
      })

      // Type cast payload to any to access Google specific fields or use a proper interface
      const googlePayload = payload as any

      if (!googlePayload.email || googlePayload.email_verified !== true || !googlePayload.sub) {
        throw new AppError('Invalid Google token payload', 401, 'invalid-google-token')
      }

      return {
        email: googlePayload.email.toLowerCase(),
        supabaseAuthId: googlePayload.sub,
        firstName: googlePayload.given_name ?? undefined,
        lastName: googlePayload.family_name ?? undefined,
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      
      throw new AppError(
        `Google token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        401,
        'invalid-google-token'
      )
    }
  }
}
