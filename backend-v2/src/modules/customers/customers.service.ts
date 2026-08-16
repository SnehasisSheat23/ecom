import { eq, ilike, or, sql } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { customers, customerAddresses } from '../../database/schema.js'

export interface CreateCustomerInput {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  companyName?: string
  companyTaxId?: string
  crNumber?: string
  customerGroup?: 'retail' | 'wholesale' | 'corporate'
  creditLimit?: number | string
  availableCredit?: number | string
  paymentTerms?: 'prepaid' | 'net_15' | 'net_30' | 'net_60'
  accountDiscountPercent?: number | string
  status?: string
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

  async getCustomers(options: { q?: string; limit?: number; page?: number }) {
    const limit = options.limit || 20
    const page = options.page || 1
    const offset = (page - 1) * limit

    const conditions = []
    if (options.q) {
      const searchPattern = `%${options.q}%`
      conditions.push(
        or(
          ilike(customers.email, searchPattern),
          ilike(customers.firstName, searchPattern),
          ilike(customers.lastName, searchPattern),
          ilike(customers.companyName, searchPattern)
        )
      )
    }

    const rawItems = await this.db
      .select()
      .from(customers)
      .where(conditions.length ? sql.join(conditions, sql` AND `) : undefined)
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
          addressLine1: defaultAddress?.addressLine1 || null,
          addressLine2: defaultAddress?.addressLine2 || null,
          city: defaultAddress?.city || null,
          country: defaultAddress?.country || null,
          postalCode: defaultAddress?.postalCode || null,
          addresses: defaultAddress ? [defaultAddress] : [],
        }
      })
    )

    return { items, page, limit }
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
