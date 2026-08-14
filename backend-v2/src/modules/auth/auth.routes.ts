import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { adminUsers, customers } from '../../database/schema.js'
import { hashPassword, verifyPassword, signJwt } from '../../lib/auth-crypto.js'
import { requireAdminAuth, requireCustomerAuth } from '../../middleware/auth.middleware.js'

const JWT_SECRET = process.env.APP_SECRET || process.env.JWT_SECRET || 'dubai-ecom-secure-jwt-secret-key-2026'

export const authRoutes = new Hono()

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
})

// ==========================================
// 1. ADMIN AUTH ENDPOINTS
// ==========================================

// POST /api/v1/auth/admin/login
authRoutes.post('/admin/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = loginSchema.parse(body)
    const normalizedEmail = parsed.email.trim().toLowerCase()

    const db = getDatabase()
    const users = await db.select().from(adminUsers).where(eq(adminUsers.email, normalizedEmail)).limit(1)

    if (users.length === 0) {
      return c.json({ success: false, error: 'Invalid admin email or password' }, 401)
    }

    const admin = users[0]
    if (admin.status !== 'active') {
      return c.json({ success: false, error: 'Admin account is deactivated' }, 403)
    }

    const isValid = await verifyPassword(parsed.password, admin.passwordHash)
    if (!isValid) {
      return c.json({ success: false, error: 'Invalid admin email or password' }, 401)
    }

    const displayName = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Admin User'
    const accessToken = signJwt(
      {
        sub: admin.id,
        email: admin.email,
        name: displayName,
        role: admin.role,
        type: 'admin',
      },
      JWT_SECRET,
      60 * 60 * 24 * 7 // 7 days
    )

    return c.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: admin.id,
          email: admin.email,
          name: displayName,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
        },
      },
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.issues.map((e: any) => e.message).join(', ') }, 400)
    }
    return c.json({ success: false, error: err.message || 'Admin login failed' }, 500)
  }
})

// GET /api/v1/auth/admin/me
authRoutes.get('/admin/me', requireAdminAuth, async (c) => {
  try {
    const adminPayload = (c as any).get('admin')
    const db = getDatabase()
    const users = await db.select().from(adminUsers).where(eq(adminUsers.id, adminPayload.sub)).limit(1)

    if (users.length === 0) {
      return c.json({ success: false, error: 'Admin user not found' }, 404)
    }

    const admin = users[0]
    return c.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Admin User',
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        status: admin.status,
      },
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch admin profile' }, 500)
  }
})

// ==========================================
// 2. STOREFRONT CUSTOMER AUTH ENDPOINTS
// ==========================================

// POST /api/v1/auth/login (Customer Login)
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = loginSchema.parse(body)
    const normalizedEmail = parsed.email.trim().toLowerCase()

    const db = getDatabase()
    const customerList = await db.select().from(customers).where(eq(customers.email, normalizedEmail)).limit(1)

    if (customerList.length === 0) {
      // Also check if this is an admin logging into general login
      const adminList = await db.select().from(adminUsers).where(eq(adminUsers.email, normalizedEmail)).limit(1)
      if (adminList.length > 0) {
        const admin = adminList[0]
        const isValid = await verifyPassword(parsed.password, admin.passwordHash)
        if (isValid) {
          const displayName = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Admin User'
          const accessToken = signJwt(
            {
              sub: admin.id,
              email: admin.email,
              name: displayName,
              role: admin.role,
              type: 'admin',
            },
            JWT_SECRET,
            60 * 60 * 24 * 7
          )
          return c.json({
            success: true,
            data: {
              accessToken,
              user: {
                id: admin.id,
                email: admin.email,
                name: displayName,
                isAdmin: true,
                role: admin.role,
              },
            },
          })
        } else {
          return c.json({ success: false, error: 'Incorrect password. Please try again.' }, 401)
        }
      }
      return c.json({ success: false, error: 'No account found with this email. Please register to create your account.' }, 404)
    }

    const customer = customerList[0]
    if (!customer.passwordHash) {
      return c.json({ success: false, error: 'No password set for this account. Please register to set up your password.' }, 400)
    }

    const isValid = await verifyPassword(parsed.password, customer.passwordHash)
    if (!isValid) {
      return c.json({ success: false, error: 'Incorrect password. Please try again.' }, 401)
    }

    const displayName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email.split('@')[0]
    const accessToken = signJwt(
      {
        sub: customer.id,
        email: customer.email,
        name: displayName,
        type: 'customer',
      },
      JWT_SECRET,
      60 * 60 * 24 * 30 // 30 days
    )

    return c.json({
      success: true,
      data: {
        accessToken,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          companyName: customer.companyName,
        },
      },
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.issues.map((e: any) => e.message).join(', ') }, 400)
    }
    return c.json({ success: false, error: err.message || 'Login failed' }, 500)
  }
})

// POST /api/v1/auth/register (Customer Registration)
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = registerSchema.parse(body)
    const normalizedEmail = parsed.email.trim().toLowerCase()

    const db = getDatabase()
    const existing = await db.select().from(customers).where(eq(customers.email, normalizedEmail)).limit(1)

    const hashedPassword = await hashPassword(parsed.password)

    let customerRecord: any

    if (existing.length > 0) {
      const cust = existing[0]
      if (cust.passwordHash) {
        return c.json({ success: false, error: 'An account with this email already exists. Please log in.' }, 409)
      }
      // Update existing guest customer profile with password
      const updated = await db
        .update(customers)
        .set({
          passwordHash: hashedPassword,
          firstName: parsed.firstName || cust.firstName,
          lastName: parsed.lastName || cust.lastName,
          phone: parsed.phone || cust.phone,
          companyName: parsed.companyName || cust.companyName,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, cust.id))
        .returning()
      customerRecord = updated[0]
    } else {
      const inserted = await db
        .insert(customers)
        .values({
          email: normalizedEmail,
          passwordHash: hashedPassword,
          firstName: parsed.firstName || '',
          lastName: parsed.lastName || '',
          phone: parsed.phone || '',
          companyName: parsed.companyName || '',
          status: 'active',
        })
        .returning()
      customerRecord = inserted[0]
    }

    const displayName = `${customerRecord.firstName || ''} ${customerRecord.lastName || ''}`.trim() || customerRecord.email.split('@')[0]
    const accessToken = signJwt(
      {
        sub: customerRecord.id,
        email: customerRecord.email,
        name: displayName,
        type: 'customer',
      },
      JWT_SECRET,
      60 * 60 * 24 * 30
    )

    return c.json(
      {
        success: true,
        data: {
          accessToken,
          customer: {
            id: customerRecord.id,
            email: customerRecord.email,
            firstName: customerRecord.firstName,
            lastName: customerRecord.lastName,
            phone: customerRecord.phone,
            companyName: customerRecord.companyName,
          },
        },
      },
      201
    )
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.issues.map((e: any) => e.message).join(', ') }, 400)
    }
    return c.json({ success: false, error: err.message || 'Registration failed' }, 500)
  }
})

// GET /api/v1/auth/me or GET /api/v1/me
const handleGetCustomerMe = async (c: any) => {
  try {
    const customerPayload = c.get('customer')
    const db = getDatabase()
    const customerList = await db.select().from(customers).where(eq(customers.id, customerPayload.sub)).limit(1)

    if (customerList.length === 0) {
      return c.json({ success: false, error: 'Customer not found' }, 404)
    }

    const customer = customerList[0]
    return c.json({
      success: true,
      data: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        companyName: customer.companyName,
        createdAt: customer.createdAt,
      },
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch profile' }, 500)
  }
}

authRoutes.get('/me', requireCustomerAuth, handleGetCustomerMe)
authRoutes.get('/', requireCustomerAuth, handleGetCustomerMe)

