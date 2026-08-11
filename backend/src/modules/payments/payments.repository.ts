import { and, desc, eq } from 'drizzle-orm'

import type { Database } from '../../lib/db.js'
import { AppError } from '../../lib/errors.js'
import { orders, paymentIntents } from '../orders/orders.schema.js'
import type { PaymentIntentRecord } from '../orders/orders.types.js'
import { paymentEvents } from './payments.schema.js'
import type {
  PaymentDetails,
  PaymentEventRecord,
  SanitizedPaymentEvent,
  SanitizedPaymentIntent,
} from './payments.types.js'

const mapPaymentIntent = (row: typeof paymentIntents.$inferSelect): PaymentIntentRecord => ({
  ...row,
  metadata: row.metadata as Record<string, unknown>,
})

const mapPaymentEvent = (row: typeof paymentEvents.$inferSelect): PaymentEventRecord => ({
  ...row,
  payload: row.payload as Record<string, unknown>,
})

const sanitizePaymentIntent = (row: PaymentIntentRecord): SanitizedPaymentIntent => ({
  id: row.id,
  orderId: row.orderId,
  status: row.status,
  amount: row.amount,
  currency: row.currency,
  provider: row.provider,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

const sanitizePaymentEvent = (row: PaymentEventRecord): SanitizedPaymentEvent => ({
  id: row.id,
  provider: row.provider,
  providerEventId: row.providerEventId,
  eventType: row.eventType,
  paymentId: row.paymentId,
  amount: row.amount,
  currency: row.currency,
  createdAt: row.createdAt,
})

export class PaymentsRepository {
  constructor(private readonly db: Database) {}
  
  getDb(): Database {
    return this.db
  }

  async transaction<T>(callback: (repository: PaymentsRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => callback(new PaymentsRepository(tx as Database)))
  }

  async findPaymentIntentById(tenantId: string, paymentIntentId: string): Promise<PaymentIntentRecord | null> {
    const [row] = await this.db
      .select()
      .from(paymentIntents)
      .where(and(eq(paymentIntents.tenantId, tenantId), eq(paymentIntents.id, paymentIntentId)))
      .limit(1)

    return row ? mapPaymentIntent(row) : null
  }

  async findPaymentIntentByIdWithLock(tenantId: string, paymentIntentId: string): Promise<PaymentIntentRecord | null> {
    const [row] = await this.db
      .select()
      .from(paymentIntents)
      .where(and(eq(paymentIntents.tenantId, tenantId), eq(paymentIntents.id, paymentIntentId)))
      .limit(1)
      .for('update')

    return row ? mapPaymentIntent(row) : null
  }

  async findPaymentIntentByProviderOrderId(tenantId: string, providerOrderId: string): Promise<PaymentIntentRecord | null> {
    const [row] = await this.db
      .select()
      .from(paymentIntents)
      .where(and(eq(paymentIntents.tenantId, tenantId), eq(paymentIntents.providerOrderId, providerOrderId)))
      .limit(1)

    return row ? mapPaymentIntent(row) : null
  }

  async findPaymentIntentByOrderId(tenantId: string, orderId: string): Promise<PaymentIntentRecord | null> {
    const [row] = await this.db
      .select()
      .from(paymentIntents)
      .where(and(eq(paymentIntents.tenantId, tenantId), eq(paymentIntents.orderId, orderId)))
      .limit(1)

    return row ? mapPaymentIntent(row) : null
  }

  async updatePaymentIntent(
    tenantId: string,
    paymentIntentId: string,
    input: Partial<typeof paymentIntents.$inferInsert>,
  ): Promise<PaymentIntentRecord> {
    const [row] = await this.db
      .update(paymentIntents)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(paymentIntents.tenantId, tenantId), eq(paymentIntents.id, paymentIntentId)))
      .returning()

    if (!row) {
      throw new AppError('Payment intent not found', 404, 'payment-intent-not-found')
    }

    return mapPaymentIntent(row)
  }

  async findOrderOwnership(tenantId: string, orderId: string): Promise<{ customerId: string | null; orderToken: string; status: string } | null> {
    const [row] = await this.db
      .select({
        customerId: orders.customerId,
        orderToken: orders.orderToken,
        status: orders.status,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
      .limit(1)

    return row ?? null
  }

  async updateOrderStatus(tenantId: string, orderId: string, status: typeof orders.$inferInsert.status): Promise<void> {
    await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
  }

  async insertPaymentEvent(input: typeof paymentEvents.$inferInsert): Promise<PaymentEventRecord | null> {
    const [row] = await this.db
      .insert(paymentEvents)
      .values(input)
      .onConflictDoNothing({
        target: [paymentEvents.tenantId, paymentEvents.providerEventId],
      })
      .returning()

    return row ? mapPaymentEvent(row) : null
  }

  async listPaymentEvents(tenantId: string, orderId: string): Promise<PaymentEventRecord[]> {
    const rows = await this.db
      .select({
        event: paymentEvents,
      })
      .from(paymentEvents)
      .innerJoin(paymentIntents, eq(paymentEvents.paymentIntentId, paymentIntents.id))
      .where(and(eq(paymentEvents.tenantId, tenantId), eq(paymentIntents.orderId, orderId)))
      .orderBy(desc(paymentEvents.createdAt))

    return rows.map((row) => mapPaymentEvent(row.event))
  }

  async getPaymentDetails(tenantId: string, orderId: string): Promise<PaymentDetails | null> {
    const paymentIntent = await this.findPaymentIntentByOrderId(tenantId, orderId)
    if (!paymentIntent) {
      return null
    }

    return {
      paymentIntent: sanitizePaymentIntent(paymentIntent),
      events: (await this.listPaymentEvents(tenantId, orderId)).map(sanitizePaymentEvent),
    }
  }
}
