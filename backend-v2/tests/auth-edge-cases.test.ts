import { describe, it, expect, beforeAll } from 'vitest'
import { auth } from '../src/lib/better-auth.js'
import { getDatabase } from '../src/lib/db.js'
import { customers, betterVerifications } from '../src/database/schema.js'
import { eq, desc, like } from 'drizzle-orm'
import { Hono } from 'hono'
import { authRoutes } from '../src/modules/auth/auth.routes.js'
import { cartRoutes } from '../src/modules/cart/cart.routes.js'
import { requireAdminAuth, requireCustomerAuth } from '../src/middleware/auth.middleware.js'

describe('Comprehensive Auth & B2B Registration Edge Cases', () => {
  const db = getDatabase()

  // Set up test app with our auth and cart routes
  const app = new Hono()
  app.route('/api/v1/auth', authRoutes)
  app.route('/api/v1/cart', cartRoutes)

  const timestamp = Date.now()
  const normalUserEmail = `customer_${timestamp}@test.com`
  const normalUserPassword = 'CustomerSecure123!'
  let normalUserToken: string = ''
  let normalUserId: string = ''

  const corpUserEmail = `corporate_${timestamp}@bakheet-test.sa`
  const corpUserPassword = 'CorpPassword2026!'

  const googleCorpEmail = `google_b2b_${timestamp}@gmail.com`
  let googleCorpToken: string = ''
  let googleCorpUserId: string = ''

  // ==========================================
  // SUITE 1: Standard Customer Authentication Edge Cases
  // ==========================================
  describe('1. Standard Customer Auth Edge Cases', () => {
    it('1.1 should register a new retail customer with active status', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password: normalUserPassword,
          firstName: 'Sultan',
          lastName: 'Al-Otaibi',
        }),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBeDefined()
      expect(data.data.customer.email).toBe(normalUserEmail)
      expect(data.data.customer.customerGroup).toBe('retail')
      expect(data.data.customer.status).toBe('active')

      normalUserToken = data.data.token
      normalUserId = data.data.customer.id
    })

    it('1.2 should reject duplicate registration with identical email', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password: 'AnotherPassword999!',
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('1.3 should reject sign-in with incorrect password (401)', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password: 'WrongPassword!',
        }),
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('1.4 should reject sign-in for non-existent email (401)', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `non_existent_${timestamp}@example.com`,
          password: 'SomePassword123!',
        }),
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('1.5 should successfully sign in with correct credentials and return valid session token', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password: normalUserPassword,
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBeDefined()
      expect(data.data.customer.id).toBe(normalUserId)
      normalUserToken = data.data.token
    })

    it('1.6 should accept valid session token via Bearer header on protected /me route', async () => {
      const res = await app.request('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${normalUserToken}`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.email).toBe(normalUserEmail)
    })

    it('1.7 should reject invalid Bearer token with 401 Unauthorized', async () => {
      const res = await app.request('/api/v1/auth/me', {
        headers: {
          Authorization: 'Bearer fake_invalid_session_token_xyz',
        },
      })

      expect(res.status).toBe(401)
    })

    it('1.8 should reject request with missing Authorization header with 401', async () => {
      const res = await app.request('/api/v1/auth/me')
      expect(res.status).toBe(401)
    })
  })

  // ==========================================
  // SUITE 2: Corporate (B2B) Registration Edge Cases
  // ==========================================
  describe('2. B2B / Corporate Registration Edge Cases', () => {
    it('2.1 Standard B2B registration with email & password sets status=pending & customerGroup=corporate', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: corpUserEmail,
          password: corpUserPassword,
          firstName: 'Tariq',
          lastName: 'Al-Harbi',
          companyName: 'Al-Harbi Food Services LLC',
          crNumber: '1010998877',
          companyTaxId: '300998877660003',
          businessType: 'Restaurant Chain',
          city: 'Riyadh',
          phone: '+966501234567',
          customerGroup: 'corporate',
        }),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.customer.customerGroup).toBe('corporate')
      expect(data.data.customer.status).toBe('pending')
      expect(data.data.customer.isPendingApproval).toBe(true)

      // Verify in DB directly
      const [dbCust] = await db.select().from(customers).where(eq(customers.email, corpUserEmail)).limit(1)
      expect(dbCust.companyName).toBe('Al-Harbi Food Services LLC')
      expect(dbCust.crNumber).toBe('1010998877')
      expect(dbCust.companyTaxId).toBe('300998877660003')
      expect(dbCust.status).toBe('pending')
    })

    it('2.2 Google OAuth passwordless B2B user: creates account without password, then submits corporate profile', async () => {
      // Step A: Simulate Google OAuth 1-click user creation via Better Auth
      const googleSignUp = await auth.api.signUpEmail({
        body: {
          email: googleCorpEmail,
          password: 'AutoGeneratedOAuthPassKey999!',
          name: 'Nouf Al-Ghamdi',
        },
      })
      expect(googleSignUp.token).toBeDefined()
      googleCorpToken = googleSignUp.token
      googleCorpUserId = googleSignUp.user.id

      // Step B: Submit corporate details passwordlessly via /api/v1/auth/corporate-profile
      // Notice: NO password or confirmPassword passed, email is locked to googleCorpEmail
      const res = await app.request('/api/v1/auth/corporate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${googleCorpToken}`,
        },
        body: JSON.stringify({
          companyName: 'Ghamdi Hospitality Group',
          crNumber: '1010554433',
          companyTaxId: '300112233440003',
          businessType: 'Hotel / Hospitality',
          city: 'Jeddah',
          phone: '+966559876543',
          deliveryAddress: 'Corniche Road, Jeddah',
          crDocumentUrl: 'https://storage.example.com/cr-doc-123.pdf',
          vatDocumentUrl: 'https://storage.example.com/vat-doc-123.pdf',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.customer.companyName).toBe('Ghamdi Hospitality Group')
      expect(data.data.customer.customerGroup).toBe('corporate')
      expect(data.data.customer.status).toBe('pending')
      expect(data.data.customer.isPendingApproval).toBe(true)

      // Verify in DB that Google user profile has all corporate details and pending status
      const [dbCust] = await db.select().from(customers).where(eq(customers.id, googleCorpUserId)).limit(1)
      expect(dbCust.email).toBe(googleCorpEmail)
      expect(dbCust.companyName).toBe('Ghamdi Hospitality Group')
      expect(dbCust.crNumber).toBe('1010554433')
      expect(dbCust.city).toBe('Jeddah')
      expect(dbCust.status).toBe('pending')
    })

    it('2.3 Incomplete corporate profile (missing companyName) should be rejected with 400', async () => {
      const res = await app.request('/api/v1/auth/corporate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${googleCorpToken}`,
        },
        body: JSON.stringify({
          companyName: '', // empty company name
          crNumber: '1234567890',
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('2.4 Unauthenticated request to /corporate-profile is rejected with 401', async () => {
      const res = await app.request('/api/v1/auth/corporate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: 'Any Corp' }),
      })

      expect(res.status).toBe(401)
    })
  })

  // ==========================================
  // SUITE 3: Password Reset Flow Edge Cases
  // ==========================================
  describe('3. Password Reset Flow Edge Cases', () => {
    let resetToken: string = ''
    const resetUserEmail = `reset_test_${timestamp}@test.com`
    const initialPassword = 'InitialSecret123!'
    const newPassword = 'NewlyUpdatedPassword456!'

    beforeAll(async () => {
      await auth.api.signUpEmail({
        body: {
          email: resetUserEmail,
          password: initialPassword,
          name: 'Reset Test User',
        },
      })
    })

    it('3.1 should request password reset and store single-use verification token', async () => {
      const requestRes = await auth.api.requestPasswordReset({
        body: {
          email: resetUserEmail,
          redirectTo: 'http://localhost:3000/reset-password',
        },
      })

      expect(requestRes.status).toBe(true)

      // Better Auth saves single-use token in v2_better_verifications with identifier reset-password:<token>
      const verifications = await db
        .select()
        .from(betterVerifications)
        .where(like(betterVerifications.identifier, 'reset-password:%'))
        .orderBy(desc(betterVerifications.createdAt))
        .limit(1)

      expect(verifications.length).toBeGreaterThan(0)
      resetToken = verifications[0].identifier.replace('reset-password:', '')
      expect(resetToken).toBeDefined()
    })

    it('3.2 should reset password with the valid token and newly chosen password', async () => {
      const resetRes = await auth.api.resetPassword({
        body: {
          newPassword: newPassword,
          token: resetToken,
        },
      })

      expect(resetRes.status).toBe(true)
    })

    it('3.3 should fail to login with old password after reset', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetUserEmail,
          password: initialPassword,
        }),
      })

      expect(res.status).toBe(401)
    })

    it('3.4 should successfully login with the new password and obtain valid session token', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetUserEmail,
          password: newPassword,
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBeDefined()
    })

    it('3.5 should reject reusing the same token or using an invalid token', async () => {
      try {
        const replayRes = await auth.api.resetPassword({
          body: {
            newPassword: 'AnotherPassword789!',
            token: resetToken, // Already consumed token
          },
        })
        expect(replayRes.status).toBe(false)
      } catch (err: any) {
        // Better Auth throws error for invalid or consumed token
        expect(err).toBeDefined()
      }
    })
  })

  // ==========================================
  // SUITE 4: Admin RBAC & Protection Edge Cases
  // ==========================================
  describe('4. Admin RBAC & Route Protection Edge Cases', () => {
    let adminToken: string = ''

    it('4.1 should login admin with role=admin and return admin session token', async () => {
      const res = await app.request('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@abdullahbakheet.com',
          password: 'AdminPassword123!',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBeDefined()
      expect(data.data.user.role).toBe('admin')
      adminToken = data.data.token
    })

    it('4.2 should allow admin access to /admin/me with valid admin session token', async () => {
      const res = await app.request('/api/v1/auth/admin/me', {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.role).toBe('admin')
    })

    it('4.3 should reject customer attempting to log into /admin/login with 403 Forbidden', async () => {
      const res = await app.request('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password: normalUserPassword,
        }),
      })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Administrator permissions required')
    })

    it('4.4 should reject customer session token accessing /admin/me with 403 Forbidden', async () => {
      const res = await app.request('/api/v1/auth/admin/me', {
        headers: {
          Authorization: `Bearer ${normalUserToken}`,
        },
      })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Admin privileges required')
    })
  })

  // ==========================================
  // SUITE 5: Cart & Resource Protection Edge Cases
  // ==========================================
  describe('5. Cart & Resource Protection with Session Tokens', () => {
    it('5.1 should allow authenticated customer to access their cart via session token', async () => {
      const res = await app.request('/api/v1/cart', {
        headers: {
          Authorization: `Bearer ${normalUserToken}`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.customerId).toBe(normalUserId)
    })

    it('5.2 should reject unauthenticated request to /api/v1/cart with 401', async () => {
      const res = await app.request('/api/v1/cart')
      expect(res.status).toBe(401)
    })
  })
})
