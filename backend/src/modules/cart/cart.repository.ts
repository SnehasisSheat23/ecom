import { and, eq, inArray, lt, sql } from 'drizzle-orm'

import type { Database } from '../../lib/db.js'
import { products, variants, variantPrices } from '../catalog/catalog.schema.js'
import { carts, cartItems } from './cart.schema.js'
import type {
  AddCartItemInput,
  CartItemRecord,
  CartOwner,
  CartRecord,
  CartVariantSnapshot,
  CreateCartInput,
} from './cart.types.js'

const mapCart = (row: typeof carts.$inferSelect): CartRecord => row
const mapCartItem = (row: typeof cartItems.$inferSelect): CartItemRecord => row

export class CartRepository {
  constructor(private readonly db: Database) {}

  getDb(): Database {
    return this.db
  }

  async transaction<T>(callback: (repository: CartRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => callback(new CartRepository(tx as Database)))
  }

  async createCart(tenantId: string, input: CreateCartInput): Promise<CartRecord> {
    const customerId = 'customerId' in input ? input.customerId : undefined
    const guestSessionId = 'guestSessionId' in input ? input.guestSessionId : undefined
    const [row] = await this.db
      .insert(carts)
      .values({
        tenantId,
        customerId: customerId ?? null,
        guestSessionId: guestSessionId ?? null,
        metadata: input.metadata ?? {},
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning()

    return mapCart(row)
  }

  async findActiveCartByOwner(tenantId: string, owner: CartOwner): Promise<CartRecord | null> {
    const where =
      'customerId' in owner
        ? and(eq(carts.tenantId, tenantId), eq(carts.customerId, owner.customerId as string), eq(carts.status, 'active'))
        : and(eq(carts.tenantId, tenantId), eq(carts.guestSessionId, owner.guestSessionId), eq(carts.status, 'active'))
    const [row] = await this.db.select().from(carts).where(where).limit(1)
    return row ? mapCart(row) : null
  }

  async findExpiredActiveCarts(limit = 100): Promise<CartRecord[]> {
    const now = new Date()
    const rows = await this.db
      .select()
      .from(carts)
      .where(and(eq(carts.status, 'active'), lt(carts.expiresAt, now)))
      .limit(limit)
    return rows.map(mapCart)
  }


  async findCartById(tenantId: string, cartId: string): Promise<CartRecord | null> {
    const [row] = await this.db
      .select()
      .from(carts)
      .where(and(eq(carts.tenantId, tenantId), eq(carts.id, cartId)))
      .limit(1)
    return row ? mapCart(row) : null
  }

  async listCartItems(tenantId: string, cartId: string): Promise<CartItemRecord[]> {
    const rows = await this.db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.tenantId, tenantId), eq(cartItems.cartId, cartId)))
    return rows.map(mapCartItem)
  }

  async findCartItemById(tenantId: string, cartId: string, itemId: string): Promise<CartItemRecord | null> {
    const [row] = await this.db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.tenantId, tenantId), eq(cartItems.cartId, cartId), eq(cartItems.id, itemId)))
      .limit(1)
    return row ? mapCartItem(row) : null
  }

  async findCartItemByVariant(tenantId: string, cartId: string, variantId: string): Promise<CartItemRecord | null> {
    const [row] = await this.db
      .select()
      .from(cartItems)
      .where(
        and(eq(cartItems.tenantId, tenantId), eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)),
      )
      .limit(1)
    return row ? mapCartItem(row) : null
  }

  async createCartItem(tenantId: string, cartId: string, input: AddCartItemInput & {
    partnerId: string | null
    productType: CartVariantSnapshot['productType']
    productTitleSnapshot: string
    unitPrice: number
  }): Promise<CartItemRecord> {
    const [row] = await this.db
      .insert(cartItems)
      .values({
        tenantId,
        cartId,
        variantId: input.variantId,
        partnerId: input.partnerId,
        productType: input.productType,
        productTitleSnapshot: input.productTitleSnapshot,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        metadata: input.metadata ?? {},
        lineTotal: input.quantity * input.unitPrice,
      })
      .returning()
    return mapCartItem(row)
  }

  async updateCartItem(
    tenantId: string,
    itemId: string,
    next: Partial<typeof cartItems.$inferInsert>,
  ): Promise<CartItemRecord> {
    const [row] = await this.db
      .update(cartItems)
      .set({ ...next, updatedAt: new Date() })
      .where(and(eq(cartItems.tenantId, tenantId), eq(cartItems.id, itemId)))
      .returning()
    return mapCartItem(row)
  }

  async deleteCartItem(tenantId: string, itemId: string): Promise<void> {
    await this.db.delete(cartItems).where(and(eq(cartItems.tenantId, tenantId), eq(cartItems.id, itemId)))
  }

  async updateCart(
    tenantId: string,
    cartId: string,
    next: Partial<typeof carts.$inferInsert>,
  ): Promise<CartRecord> {
    const [row] = await this.db
      .update(carts)
      .set({ ...next, updatedAt: new Date() })
      .where(and(eq(carts.tenantId, tenantId), eq(carts.id, cartId)))
      .returning()
    return mapCart(row)
  }

  async deleteCartById(tenantId: string, cartId: string): Promise<void> {
    await this.db.delete(carts).where(and(eq(carts.tenantId, tenantId), eq(carts.id, cartId)))
  }

  async unlinkGuestSession(tenantId: string, guestSessionId: string): Promise<void> {
    await this.db
      .delete(carts)
      .where(and(eq(carts.tenantId, tenantId), eq(carts.guestSessionId, guestSessionId)))
  }

  /**
   * MAINTENANCE: This method uses raw SQL for `SELECT ... FOR UPDATE`.
   * If you add/remove/rename columns in the `carts` schema, you MUST update
   * the column list and aliases below to match, otherwise the returned
   * CartRecord will have missing or stale fields.
   */
  async lockCart(tenantId: string, cartId: string): Promise<CartRecord | null> {
    const result = await this.db.execute(sql<CartRecord>`
      SELECT
        id,
        tenant_id AS "tenantId",
        customer_id AS "customerId",
        guest_session_id AS "guestSessionId",
        coupon_code AS "couponCode",
        loyalty_points AS "loyaltyPoints",
        status,
        selected_shipping_option_id AS "selectedShippingOptionId",
        subtotal,
        shipping_amount AS "shippingAmount",
        discount_amount AS "discountAmount",
        total,
        expires_at AS "expiresAt",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM carts
      WHERE tenant_id = ${tenantId} AND id = ${cartId}
      FOR UPDATE
    `)
    return ((result.rows[0] as unknown) as CartRecord | undefined) ?? null
  }

  async getVariantSnapshots(tenantId: string, variantIds: string[]): Promise<CartVariantSnapshot[]> {
    if (variantIds.length === 0) {
      return []
    }

    const rows = await this.db
      .select({
        variantId: variants.id,
        tenantId: variants.tenantId,
        productId: variants.productId,
        partnerId: products.partnerId,
        sku: variants.sku,
        title: variants.title,
        productTitle: products.title,
        price: variantPrices.price,
        productType: products.productType,
        trackInventory: variants.trackInventory,
        weightGrams: variants.weightGrams,
        productStatus: products.status,
        deletedAt: variants.deletedAt,
        productDeletedAt: products.deletedAt,
      })
      .from(variants)
      .innerJoin(products, and(eq(variants.productId, products.id), eq(products.tenantId, tenantId)))
      .leftJoin(variantPrices, and(eq(variantPrices.variantId, variants.id), eq(variantPrices.tenantId, tenantId)))
      .where(and(eq(variants.tenantId, tenantId), inArray(variants.id, variantIds)))

    return rows.map((row) => ({
      variantId: row.variantId,
      tenantId: row.tenantId,
      productId: row.productId,
      partnerId: row.partnerId,
      sku: row.sku,
      title: row.title,
      productTitle: row.productTitle,
      price: row.price ?? 0,
      productType: row.productType,
      trackInventory: row.trackInventory,
      weightGrams: row.weightGrams,
      productStatus: row.productStatus,
      isDeleted: Boolean(row.deletedAt || row.productDeletedAt),
    }))
  }
}
