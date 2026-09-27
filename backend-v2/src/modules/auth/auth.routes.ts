import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { customers } from '../../database/schema.js'
import { requireAdminAuth, requireCustomerAuth } from '../../middleware/auth.middleware.js'
import { notify } from '../notifications/index.js'
import { auth } from '../../lib/better-auth.js'

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
  companyTaxId: z.string().optional(),
  crNumber: z.string().optional(),
  businessType: z.string().optional(),
  city: z.string().optional(),
  deliveryAddress: z.string().optional(),
  crDocumentUrl: z.string().optional(),
  vatDocumentUrl: z.string().optional(),
  customerGroup: z.enum(['retail', 'wholesale', 'corporate', 'vip']).optional(),
})

// ==========================================
// 1. ADMIN AUTH ENDPOINTS (Clean Better Auth)
// ==========================================

// POST /api/v1/auth/admin/login
authRoutes.post('/admin/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = loginSchema.parse(body)
    const normalizedEmail = parsed.email.trim().toLowerCase()

    const betterRes: any = await auth.api.signInEmail({
      body: {
        email: normalizedEmail,
        password: parsed.password,
      },
    })

    if (!betterRes || !betterRes.user) {
      return c.json({ success: false, error: 'Invalid admin email or password' }, 401)
    }

    if (betterRes.user.role !== 'admin' && betterRes.user.role !== 'superadmin') {
      return c.json({ success: false, error: 'Access denied: Administrator permissions required.' }, 403)
    }

    const displayName =
      betterRes.user.name ||
      `${betterRes.user.firstName || ''} ${betterRes.user.lastName || ''}`.trim() ||
      betterRes.user.email.split('@')[0]

    return c.json({
      success: true,
      data: {
        accessToken: betterRes.token,
        token: betterRes.token,
        user: {
          id: betterRes.user.id,
          email: betterRes.user.email,
          name: displayName,
          firstName: betterRes.user.firstName,
          lastName: betterRes.user.lastName,
          role: betterRes.user.role,
          avatar: betterRes.user.image || '/footer_logo.png',
          image: betterRes.user.image || '/footer_logo.png',
        },
      },
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.issues.map((e: any) => e.message).join(', ') }, 400)
    }
    return c.json({ success: false, error: err.body?.message || err.message || 'Invalid admin credentials' }, 401)
  }
})

// GET /api/v1/auth/admin/me
authRoutes.get('/admin/me', requireAdminAuth, async (c) => {
  try {
    const admin = (c as any).get('admin')
    const db = getDatabase()
    const customerAdmins = await db.select().from(customers).where(eq(customers.id, admin.id || admin.sub)).limit(1)

    if (customerAdmins.length === 0) {
      return c.json({ success: false, error: 'Admin user not found' }, 404)
    }

    const current = customerAdmins[0]
    return c.json({
      success: true,
      data: {
        id: current.id,
        email: current.email,
        name: current.name || `${current.firstName || ''} ${current.lastName || ''}`.trim() || 'Admin User',
        firstName: current.firstName,
        lastName: current.lastName,
        role: current.role,
        status: current.status,
        avatar: current.image || '/footer_logo.png',
        image: current.image || '/footer_logo.png',
      },
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch admin profile' }, 500)
  }
})

// ==========================================
// 2. STOREFRONT CUSTOMER AUTH (Clean Better Auth)
// ==========================================

// POST /api/v1/auth/login (Customer Login)
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = loginSchema.parse(body)
    const normalizedEmail = parsed.email.trim().toLowerCase()

    const betterRes: any = await auth.api.signInEmail({
      body: {
        email: normalizedEmail,
        password: parsed.password,
      },
    })

    if (!betterRes || !betterRes.user) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401)
    }

    const db = getDatabase()
    const custRows = await db.select().from(customers).where(eq(customers.id, betterRes.user.id)).limit(1)
    const customer = custRows[0] || betterRes.user

    return c.json({
      success: true,
      data: {
        accessToken: betterRes.token,
        token: betterRes.token,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          companyName: customer.companyName,
          companyTaxId: customer.companyTaxId,
          crNumber: customer.crNumber,
          customerGroup: customer.customerGroup || 'retail',
          creditLimit: parseFloat(customer.creditLimit || '0'),
          availableCredit: parseFloat(customer.availableCredit || '0'),
          paymentTerms: customer.paymentTerms || 'prepaid',
          accountDiscountPercent: parseFloat(customer.accountDiscountPercent || '0'),
          role: customer.role || 'customer',
        },
      },
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.issues.map((e: any) => e.message).join(', ') }, 400)
    }
    return c.json({ success: false, error: err.body?.message || err.message || 'Login failed' }, 401)
  }
})

// POST /api/v1/auth/register (Customer Registration)
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = registerSchema.parse(body)
    const normalizedEmail = parsed.email.trim().toLowerCase()

    const isCorporate = Boolean(
      parsed.companyName ||
      parsed.companyTaxId ||
      parsed.crNumber ||
      parsed.customerGroup === 'corporate' ||
      parsed.customerGroup === 'wholesale'
    )
    const targetGroup = parsed.customerGroup || (isCorporate ? 'corporate' : 'retail')
    const initialStatus = isCorporate ? 'pending' : 'active'
    const fullName = `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim() || normalizedEmail.split('@')[0]

    // Create user via Better Auth
    const betterRes: any = await auth.api.signUpEmail({
      body: {
        email: normalizedEmail,
        password: parsed.password,
        name: fullName,
      },
    })

    if (!betterRes || !betterRes.user) {
      return c.json({ success: false, error: 'Registration failed. Email may already be in use.' }, 400)
    }

    const db = getDatabase()
    // Update additional customer profile fields
    const updated = await db
      .update(customers)
      .set({
        firstName: parsed.firstName || '',
        lastName: parsed.lastName || '',
        phone: parsed.phone || '',
        companyName: parsed.companyName || '',
        companyTaxId: parsed.companyTaxId || '',
        crNumber: parsed.crNumber || '',
        businessType: parsed.businessType || null,
        city: parsed.city || null,
        deliveryAddress: parsed.deliveryAddress || null,
        crDocumentUrl: parsed.crDocumentUrl || null,
        vatDocumentUrl: parsed.vatDocumentUrl || null,
        customerGroup: targetGroup,
        status: initialStatus,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, betterRes.user.id))
      .returning()

    const customerRecord = updated[0] || betterRes.user
    const displayName = `${customerRecord.firstName || ''} ${customerRecord.lastName || ''}`.trim() || customerRecord.email.split('@')[0]

    if (isCorporate) {
      notify('BUSINESS_REGISTRATION_SUBMITTED', {
        companyName: customerRecord.companyName || 'Corporate Entity',
        contactPerson: displayName,
        email: customerRecord.email,
        phone: customerRecord.phone,
        crNumber: customerRecord.crNumber,
        vatNumber: customerRecord.companyTaxId,
        businessType: customerRecord.businessType,
        city: customerRecord.city,
      })
    } else {
      notify('CUSTOMER_WELCOME', {
        customerName: displayName,
        customerEmail: customerRecord.email,
      })
    }

    return c.json(
      {
        success: true,
        data: {
          accessToken: betterRes.token,
          token: betterRes.token,
          customer: {
            id: customerRecord.id,
            email: customerRecord.email,
            firstName: customerRecord.firstName,
            lastName: customerRecord.lastName,
            phone: customerRecord.phone,
            companyName: customerRecord.companyName,
            customerGroup: customerRecord.customerGroup,
            status: customerRecord.status,
            isPendingApproval: customerRecord.status === 'pending',
          },
          message: isCorporate && customerRecord.status === 'pending'
            ? 'Your corporate registration has been submitted and is currently under review.'
            : 'Account registered successfully.',
        },
      },
      201
    )
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.issues.map((e: any) => e.message).join(', ') }, 400)
    }
    return c.json({ success: false, error: err.body?.message || err.message || 'Registration failed' }, 400)
  }
})

// GET /api/v1/auth/me or GET /api/v1/me
const handleGetCustomerMe = async (c: any) => {
  try {
    const customerPayload = c.get('customer')
    const customerId = c.get('customerId') || customerPayload?.id || customerPayload?.sub
    const db = getDatabase()
    const customerList = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)

    if (customerList.length === 0) {
      return c.json({ success: false, error: 'Customer not found' }, 404)
    }

    const customer = customerList[0]
    return c.json({
      success: true,
      data: {
        id: customer.id,
        email: customer.email,
        name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        companyName: customer.companyName,
        companyTaxId: customer.companyTaxId,
        crNumber: customer.crNumber,
        businessType: customer.businessType,
        city: customer.city,
        customerGroup: customer.customerGroup || 'retail',
        creditLimit: parseFloat(customer.creditLimit || '0'),
        availableCredit: parseFloat(customer.availableCredit || '0'),
        paymentTerms: customer.paymentTerms || 'prepaid',
        accountDiscountPercent: parseFloat(customer.accountDiscountPercent || '0'),
        createdAt: customer.createdAt,
      },
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch profile' }, 500)
  }
}

authRoutes.get('/me', requireCustomerAuth, handleGetCustomerMe)
authRoutes.get('/', requireCustomerAuth, handleGetCustomerMe)

// POST /api/v1/auth/corporate-profile (Complete Business Details for Google OAuth / Logged-in Customer)
const corporateProfileSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  crNumber: z.string().optional(),
  companyTaxId: z.string().optional(),
  businessType: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  crDocumentUrl: z.string().optional(),
  vatDocumentUrl: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

authRoutes.post('/corporate-profile', requireCustomerAuth, async (c) => {
  try {
    const customerId = (c as any).get('customerId')
    const body = await c.req.json()
    const parsed = corporateProfileSchema.parse(body)

    const db = getDatabase()
    const existing = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)

    if (existing.length === 0) {
      return c.json({ success: false, error: 'Customer account not found' }, 404)
    }

    const current = existing[0]

    const updated = await db
      .update(customers)
      .set({
        companyName: parsed.companyName,
        crNumber: parsed.crNumber || current.crNumber,
        companyTaxId: parsed.companyTaxId || current.companyTaxId,
        businessType: parsed.businessType || current.businessType,
        city: parsed.city || current.city,
        phone: parsed.phone || current.phone,
        deliveryAddress: parsed.deliveryAddress || current.deliveryAddress,
        crDocumentUrl: parsed.crDocumentUrl || current.crDocumentUrl,
        vatDocumentUrl: parsed.vatDocumentUrl || current.vatDocumentUrl,
        firstName: parsed.firstName || current.firstName,
        lastName: parsed.lastName || current.lastName,
        customerGroup: 'corporate',
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning()

    const customerRecord = updated[0]
    const displayName = `${customerRecord.firstName || ''} ${customerRecord.lastName || ''}`.trim() || customerRecord.email.split('@')[0]

    // Send admin notification
    notify('BUSINESS_REGISTRATION_SUBMITTED', {
      companyName: customerRecord.companyName || 'Corporate Entity',
      contactPerson: displayName,
      email: customerRecord.email,
      phone: customerRecord.phone,
      crNumber: customerRecord.crNumber,
      vatNumber: customerRecord.companyTaxId,
      businessType: customerRecord.businessType,
      city: customerRecord.city,
    })

    return c.json({
      success: true,
      data: {
        customer: {
          id: customerRecord.id,
          email: customerRecord.email,
          firstName: customerRecord.firstName,
          lastName: customerRecord.lastName,
          phone: customerRecord.phone,
          companyName: customerRecord.companyName,
          customerGroup: customerRecord.customerGroup,
          status: customerRecord.status,
          isPendingApproval: customerRecord.status === 'pending',
        },
        message: 'Your corporate registration has been submitted and is currently under review.',
      },
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, error: err.issues.map((e: any) => e.message).join(', ') }, 400)
    }
    return c.json({ success: false, error: err.message || 'Failed to update business profile' }, 500)
  }
})
