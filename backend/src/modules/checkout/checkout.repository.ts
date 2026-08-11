import { and, eq } from 'drizzle-orm'

import type { Database } from '../../lib/db.js'
import { checkouts, checkoutGroups } from './checkout.schema.js'
import type {
  CheckoutGroupRecord,
  CheckoutRecord,
  CheckoutStatus,
} from './checkout.types.js'

export class CheckoutRepository {
  constructor(private readonly db: Database) {}

  getDb(): Database {
    return this.db
  }

  async transaction<T>(callback: (repo: CheckoutRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => callback(new CheckoutRepository(tx as Database)))
  }

  async createCheckout(input: typeof checkouts.$inferInsert): Promise<CheckoutRecord> {
    const [row] = await this.db.insert(checkouts).values(input).returning()
    return row
  }

  async findCheckoutById(tenantId: string, checkoutId: string): Promise<CheckoutRecord | null> {
    const rows = await this.db
      .select()
      .from(checkouts)
      .where(and(eq(checkouts.tenantId, tenantId), eq(checkouts.id, checkoutId)))
      .limit(1)

    return rows[0] ?? null
  }

  async updateCheckout(
    tenantId: string,
    checkoutId: string,
    next: Partial<typeof checkouts.$inferInsert>,
  ): Promise<CheckoutRecord> {
    const [row] = await this.db
      .update(checkouts)
      .set({ ...next, updatedAt: new Date() })
      .where(and(eq(checkouts.tenantId, tenantId), eq(checkouts.id, checkoutId)))
      .returning()

    return row
  }

  async createCheckoutGroup(input: typeof checkoutGroups.$inferInsert): Promise<CheckoutGroupRecord> {
    const [row] = await this.db.insert(checkoutGroups).values(input).returning()
    return row
  }

  async findCheckoutGroupById(tenantId: string, groupId: string): Promise<CheckoutGroupRecord | null> {
    const rows = await this.db
      .select()
      .from(checkoutGroups)
      .where(and(eq(checkoutGroups.tenantId, tenantId), eq(checkoutGroups.id, groupId)))
      .limit(1)

    return rows[0] ?? null
  }
}
