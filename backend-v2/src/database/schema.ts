import { pgTable, uuid, varchar, integer, jsonb, timestamp, boolean, numeric, text, AnyPgColumn } from 'drizzle-orm/pg-core'

// ==========================================
// 1. CATEGORIES SCHEMA (Hierarchical Category Tree)
// ==========================================
export const categories = pgTable('v2_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'cascade' }),
  translations: jsonb('translations').notNull().$type<{
    en?: { name: string; description?: string; slug: string }
    ar?: { name: string; description?: string; slug: string }
  }>(),
  image: varchar('image', { length: 1000 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// 2. PRODUCTS SCHEMA
// ==========================================
export interface PriceTier {
  minQty: number
  maxQty?: number
  price: number
}

export const products = pgTable('v2_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  translations: jsonb('translations').notNull().$type<{
    en?: { title: string; description: string; slug: string }
    ar?: { title: string; description: string; slug: string }
  }>(),
  pricing: jsonb('pricing').notNull().$type<{
    AED?: { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] }
    SAR?: { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] }
    INR?: { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] }
    GBP?: { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] }
    USD?: { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] }
    EUR?: { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] }
    [currency: string]: { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] } | undefined
  }>(),
  moq: integer('moq').notNull().default(1),
  moqStep: integer('moq_step').notNull().default(1),
  seo: jsonb('seo').$type<{
    title?: string
    description?: string
    keywords?: string
    canonicalUrl?: string
  }>(),
  attributes: jsonb('attributes').$type<Record<string, any>>().default({}),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  specifications: jsonb('specifications').$type<Record<string, any>>().default({}),
  images: jsonb('images').$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// 3. CUSTOMERS SCHEMA
// ==========================================
export const customers = pgTable('v2_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  companyName: varchar('company_name', { length: 150 }),
  companyTaxId: varchar('company_tax_id', { length: 50 }),
  crNumber: varchar('cr_number', { length: 50 }),
  customerGroup: varchar('customer_group', { length: 50 }).notNull().default('retail'), // 'retail' | 'wholesale' | 'corporate_vip'
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull().default('0.00'),
  availableCredit: numeric('available_credit', { precision: 12, scale: 2 }).notNull().default('0.00'),
  paymentTerms: varchar('payment_terms', { length: 50 }).notNull().default('prepaid'), // 'prepaid' | 'net_15' | 'net_30' | 'net_60'
  accountDiscountPercent: numeric('account_discount_percent', { precision: 5, scale: 2 }).notNull().default('0.00'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const customerAddresses = pgTable('v2_customer_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 50 }).default('Home'),
  recipientName: varchar('recipient_name', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  addressLine1: varchar('address_line1', { length: 255 }).notNull(),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).notNull().default('United Arab Emirates'),
  postalCode: varchar('postal_code', { length: 50 }),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// 4. ADMIN USERS & AUTH SESSIONS SCHEMA
// ==========================================
export const adminUsers = pgTable('v2_admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).default('Admin'),
  lastName: varchar('last_name', { length: 100 }).default('User'),
  role: varchar('role', { length: 50 }).notNull().default('admin'), // 'admin' | 'superadmin' | 'staff'
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const authSessions = pgTable('v2_auth_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  userType: varchar('user_type', { length: 20 }).notNull(), // 'admin' | 'customer'
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// 5. ORDERS SCHEMA
// ==========================================
export const orders = pgTable('v2_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: varchar('order_number', { length: 100 }).notNull().unique(),
  customerId: uuid('customer_id').references(() => customers.id),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  currency: varchar('currency', { length: 10 }).notNull().default('AED'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  shippingCost: numeric('shipping_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethodType: varchar('payment_method_type', { length: 50 }).notNull().default('CARD'), // 'CARD' | 'MADA' | 'APPLE_PAY' | 'BANK_TRANSFER' | 'PURCHASE_ORDER' | 'CREDIT_TERMS'
  paymentReceiptUrl: varchar('payment_receipt_url', { length: 500 }),
  poDocumentUrl: varchar('po_document_url', { length: 500 }),
  poNumber: varchar('po_number', { length: 100 }),
  quotationId: uuid('quotation_id'),
  shippingAddressSnapshot: jsonb('shipping_address_snapshot').$type<Record<string, any>>(),
  billingAddressSnapshot: jsonb('billing_address_snapshot').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const orderItems = pgTable('v2_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),
  sku: varchar('sku', { length: 100 }),
  productNameSnapshot: jsonb('product_name_snapshot').$type<{ en?: string; ar?: string; title?: string; image?: string; imageUrl?: string } | string>(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
})

// ==========================================
// 6. CARTS & CART ITEMS SCHEMA
// ==========================================
export const carts = pgTable('v2_carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }).unique(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'converted' | 'abandoned'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cartItems = pgTable('v2_cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }),
  itemMetadata: jsonb('item_metadata').$type<{
    name?: string
    image?: string
    category?: string
    moq?: number
    moqStep?: number
    variantId?: string
    specifications?: Record<string, any>
  }>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// 7. WISHLIST ITEMS SCHEMA
// ==========================================
export const wishlistItems = pgTable('v2_wishlist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// 8. SHIPPING METHODS SCHEMA
// ==========================================
export const shippingMethods = pgTable('v2_shipping_methods', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  arabicName: varchar('arabic_name', { length: 255 }),
  description: text('description'),
  arabicDescription: text('arabic_description'),
  estimatedDays: varchar('estimated_days', { length: 100 }).notNull().default('2 - 4 business days'),
  arabicEstimatedDays: varchar('arabic_estimated_days', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  rates: jsonb('rates').$type<Record<string, number>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// 9. B2B QUOTATIONS & QUOTATION ITEMS SCHEMA
// ==========================================
export const quotations = pgTable('v2_quotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteNumber: varchar('quote_number', { length: 100 }).notNull().unique(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  customerName: varchar('customer_name', { length: 150 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }),
  companyName: varchar('company_name', { length: 150 }),
  taxNumber: varchar('tax_number', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull().default('pending_review'), // 'pending_review' | 'quoted' | 'accepted' | 'rejected' | 'expired' | 'converted'
  currency: varchar('currency', { length: 10 }).notNull().default('SAR'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0.00'),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  shippingCost: numeric('shipping_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  adminNotes: text('admin_notes'),
  customerNotes: text('customer_notes'),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  paymentLink: varchar('payment_link', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const quotationItems = pgTable('v2_quotation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  quotationId: uuid('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  sku: varchar('sku', { length: 100 }),
  productNameSnapshot: jsonb('product_name_snapshot').$type<{ en?: string; ar?: string; title?: string; image?: string; imageUrl?: string } | string>().notNull(),
  requestedQuantity: integer('requested_quantity').notNull(),
  originalUnitPrice: numeric('original_unit_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  quotedUnitPrice: numeric('quoted_unit_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
})
