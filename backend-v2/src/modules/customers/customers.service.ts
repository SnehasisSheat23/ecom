import { eq, ilike, or, and, sql, count } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { customers, customerAddresses } from '../../database/schema.js'
import { notify } from '../notifications/index.js'

export interface CreateCustomerInput {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  companyName?: string
  companyTaxId?: string
  crNumber?: string
  businessType?: string
  city?: string
  deliveryAddress?: string
  crDocumentUrl?: string
  vatDocumentUrl?: string
  customerGroup?: 'retail' | 'wholesale' | 'corporate'
  creditLimit?: number | string
  availableCredit?: number | string
  paymentTerms?: 'prepaid' | 'net_15' | 'net_30' | 'net_60'
  accountDiscountPercent?: number | string
  status?: string
  rejectionReason?: string
}

export interface CreateAddressInput {
  label?: string
  recipientName?: string
  phone?: string
  addressLine1: string
  addressLine2?: string
  city: string
  country?: string
  postalCode?: string
  isDefault?: boolean
}

export class CustomersService {
  private db = getDatabase()

  async createCustomer(input: CreateCustomerInput) {
    const formattedInput = {
      ...input,
      creditLimit: input.creditLimit !== undefined ? String(input.creditLimit) : '0.00',
      availableCredit: input.availableCredit !== undefined ? String(input.availableCredit) : (input.creditLimit !== undefined ? String(input.creditLimit) : '0.00'),
      accountDiscountPercent: input.accountDiscountPercent !== undefined ? String(input.accountDiscountPercent) : '0.00',
    }
    const [customer] = await this.db.insert(customers).values(formattedInput as any).returning()
    return customer
  }

  async getCustomers(options: { q?: string; status?: string; customerGroup?: string; limit?: number; page?: number }) {
    const limit = options.limit || 20
    const page = options.page || 1
    const offset = (page - 1) * limit

    const conditions: any[] = []
    if (options.q) {
      const searchPattern = `%${options.q}%`
      conditions.push(
        or(
          ilike(customers.email, searchPattern),
          ilike(customers.firstName, searchPattern),
          ilike(customers.lastName, searchPattern),
          ilike(customers.companyName, searchPattern),
          ilike(customers.crNumber, searchPattern),
          ilike(customers.companyTaxId, searchPattern)
        )
      )
    }

    if (options.status && options.status !== 'all') {
      conditions.push(eq(customers.status, options.status))
    }

    if (options.customerGroup && options.customerGroup !== 'all') {
      if (options.customerGroup === 'corporate' || options.customerGroup === 'wholesale' || options.customerGroup === 'b2b') {
        conditions.push(
          or(
            eq(customers.customerGroup, 'corporate'),
            eq(customers.customerGroup, 'wholesale'),
            sql`${customers.companyName} IS NOT NULL AND ${customers.companyName} != ''`,
            sql`${customers.crNumber} IS NOT NULL AND ${customers.crNumber} != ''`
          )
        )
      } else if (options.customerGroup === 'retail') {
        conditions.push(
          and(
            or(eq(customers.customerGroup, 'retail'), sql`${customers.customerGroup} IS NULL`),
            or(sql`${customers.companyName} IS NULL`, sql`${customers.companyName} = ''`)
          )
        )
      } else {
        conditions.push(eq(customers.customerGroup, options.customerGroup))
      }
    }

    const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined

    // Get total count
    const [countResult] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(whereClause)
    const total = Number(countResult?.count || 0)

    const rawItems = await this.db
      .select()
      .from(customers)
      .where(whereClause)
      .limit(limit)
      .offset(offset)

    // Attach default address info for each customer
    const items = await Promise.all(
      rawItems.map(async (c) => {
        const [defaultAddress] = await this.db
          .select()
          .from(customerAddresses)
          .where(eq(customerAddresses.customerId, c.id))
          .limit(1)

        return {
          ...c,
          addressLine1: defaultAddress?.addressLine1 || c.deliveryAddress || null,
          addressLine2: defaultAddress?.addressLine2 || null,
          city: defaultAddress?.city || c.city || null,
          country: defaultAddress?.country || null,
          postalCode: defaultAddress?.postalCode || null,
          addresses: defaultAddress ? [defaultAddress] : [],
        }
      })
    )

    return { items, page, limit, total }
  }

  async getCustomerById(id: string) {
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null
    }

    const [customer] = await this.db.select().from(customers).where(eq(customers.id, id)).limit(1)
    if (!customer) return null

    const addresses = await this.db.select().from(customerAddresses).where(eq(customerAddresses.customerId, id))

    // 1. Fetch Customer Cart Items from Database
    const { CartService } = await import('../cart/cart.service.js')
    const cartService = new CartService()
    const cart = await cartService.getCart(id).catch(() => ({ items: [], totalItems: 0, subtotal: 0 }))

    // 2. Fetch Customer Wishlist Items from Database
    const { WishlistService } = await import('../wishlist/wishlist.service.js')
    const wishlistService = new WishlistService()
    const wishlist = await wishlistService.getWishlist(id).catch(() => ({ items: [], total: 0 }))

    return { 
      ...customer, 
      addresses,
      cart: cart.items || [],
      cartSummary: {
        totalItems: cart.totalItems || 0,
        subtotal: cart.subtotal || 0,
      },
      wishlist: wishlist.items || [],
      wishlistSummary: {
        totalItems: wishlist.total || (wishlist.items || []).length,
      }
    }
  }

  async updateCustomer(id: string, input: Partial<CreateCustomerInput>) {
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null
    }

    const formattedInput: any = { ...input, updatedAt: new Date() }
    if (input.creditLimit !== undefined) formattedInput.creditLimit = String(input.creditLimit)
    if (input.availableCredit !== undefined) formattedInput.availableCredit = String(input.availableCredit)
    if (input.accountDiscountPercent !== undefined) formattedInput.accountDiscountPercent = String(input.accountDiscountPercent)

    const [updated] = await this.db
      .update(customers)
      .set(formattedInput)
      .where(eq(customers.id, id))
      .returning()
    return updated
  }

  async updateCustomerStatus(
    id: string,
    input: {
      status: 'pending' | 'approved' | 'active' | 'rejected' | 'suspended' | string
      customerGroup?: 'retail' | 'wholesale' | 'corporate'
      creditLimit?: number | string
      paymentTerms?: 'prepaid' | 'net_15' | 'net_30' | 'net_60'
      rejectionReason?: string
    }
  ) {
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null
    }

    const formattedInput: any = {
      status: input.status,
      updatedAt: new Date(),
    }
    if (input.customerGroup) formattedInput.customerGroup = input.customerGroup
    if (input.creditLimit !== undefined) {
      formattedInput.creditLimit = String(input.creditLimit)
      formattedInput.availableCredit = String(input.creditLimit)
    }
    if (input.paymentTerms) formattedInput.paymentTerms = input.paymentTerms
    if (input.rejectionReason !== undefined) formattedInput.rejectionReason = input.rejectionReason

    const [updated] = await this.db
      .update(customers)
      .set(formattedInput)
      .where(eq(customers.id, id))
      .returning()

    // When admin approves a corporate account, fire-and-forget congratulations email!
    if (updated && (input.status === 'approved' || input.status === 'active')) {
      const displayName = `${updated.firstName || ''} ${updated.lastName || ''}`.trim() || updated.companyName || 'Corporate Partner'
      notify('BUSINESS_ACCOUNT_APPROVED', {
        companyName: updated.companyName || 'Corporate Account',
        contactPerson: displayName,
        email: updated.email,
        customerGroup: updated.customerGroup,
        creditLimit: updated.creditLimit,
        paymentTerms: updated.paymentTerms,
      })
    }

    return updated
  }

  async deleteCustomer(id: string) {
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null
    }

    const [deleted] = await this.db.delete(customers).where(eq(customers.id, id)).returning()
    return deleted
  }

  // Address CRUD
  async addAddress(customerId: string, input: CreateAddressInput) {
    if (input.isDefault) {
      await this.db.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.customerId, customerId))
    }

    const [address] = await this.db
      .insert(customerAddresses)
      .values({ ...input, customerId })
      .returning()
    return address
  }

  async getAddresses(customerId: string) {
    return this.db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId))
  }

  async updateAddress(addressId: string, input: Partial<CreateAddressInput>) {
    const [updated] = await this.db.update(customerAddresses).set(input).where(eq(customerAddresses.id, addressId)).returning()
    return updated
  }

  async deleteAddress(addressId: string) {
    const [deleted] = await this.db.delete(customerAddresses).where(eq(customerAddresses.id, addressId)).returning()
    return deleted
  }
}
