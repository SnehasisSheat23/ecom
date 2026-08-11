import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm'
import type { Database } from '../../lib/db.js'
import { supportTickets, supportMessages } from './support.schema.js'
import { customers } from '../customers/customers.schema.js'
import { partners } from '../partner/partner.schema.js'
import { orders } from '../orders/orders.schema.js'
import type { 
  SupportTicket, 
  SupportMessage, 
  SupportTicketWithDetails,
  TicketStatus
} from './support.types.js'
import { PaginatedResult } from '../../lib/types.js'

export class SupportRepository {
  constructor(private readonly db: Database) {}

  async transaction<T>(callback: (repository: SupportRepository) => Promise<T>): Promise<T> {
    return await this.db.transaction(async (tx) => {
      const txRepository = new SupportRepository(tx as any)
      return await callback(txRepository)
    })
  }

  async createTicket(input: typeof supportTickets.$inferInsert): Promise<SupportTicket> {
    const [row] = await this.db.insert(supportTickets).values(input).returning()
    return row
  }

  async createMessage(input: typeof supportMessages.$inferInsert): Promise<SupportMessage> {
    const [row] = await this.db.insert(supportMessages).values(input).returning()
    return row
  }

  async findTicketById(tenantId: string, id: string): Promise<SupportTicket | null> {
    const [row] = await this.db
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.tenantId, tenantId), eq(supportTickets.id, id)))
      .limit(1)
    return row ?? null
  }

  async getTicketWithDetails(tenantId: string, id: string): Promise<SupportTicketWithDetails | null> {
    const [row] = await this.db
      .select({
        ticket: supportTickets,
        customerName: sql<string>`COALESCE(${customers.firstName}, '') || ' ' || COALESCE(${customers.lastName}, '')`.as('customer_name'),
        vendorName: partners.name,
        orderNumber: orders.orderNumber,
      })
      .from(supportTickets)
      .innerJoin(customers, eq(supportTickets.customerId, customers.id))
      .innerJoin(orders, eq(supportTickets.orderId, orders.id))
      .leftJoin(partners, eq(supportTickets.partnerId, partners.id))
      .where(and(eq(supportTickets.tenantId, tenantId), eq(supportTickets.id, id)))
      .limit(1)

    if (!row) return null

    const messages = await this.db
      .select()
      .from(supportMessages)
      .where(and(eq(supportMessages.tenantId, tenantId), eq(supportMessages.ticketId, id)))
      .orderBy(desc(supportMessages.createdAt))

    return {
      ...row.ticket,
      customerName: row.customerName,
      vendorName: row.vendorName,
      orderNumber: row.orderNumber,
      messages,
    }
  }

  async listTickets(
    tenantId: string,
    filters: {
      customerId?: string
      partnerId?: string | null
      status?: TicketStatus
      page?: number
      perPage?: number
    }
  ): Promise<PaginatedResult<SupportTicketWithDetails>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const offset = (page - 1) * perPage

    const conditions = [eq(supportTickets.tenantId, tenantId)]
    if (filters.customerId) conditions.push(eq(supportTickets.customerId, filters.customerId))
    if (filters.partnerId !== undefined) {
      if (filters.partnerId === null) {
        conditions.push(sql`${supportTickets.partnerId} IS NULL`)
      } else {
        conditions.push(eq(supportTickets.partnerId, filters.partnerId))
      }
    }
    if (filters.status) conditions.push(eq(supportTickets.status, filters.status))

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(supportTickets)
        .where(and(...conditions)),
      this.db
        .select({
          ticket: supportTickets,
          customerName: sql<string>`COALESCE(${customers.firstName}, '') || ' ' || COALESCE(${customers.lastName}, '')`.as('customer_name'),
          vendorName: partners.name,
          orderNumber: orders.orderNumber,
        })
        .from(supportTickets)
        .innerJoin(customers, eq(supportTickets.customerId, customers.id))
        .innerJoin(orders, eq(supportTickets.orderId, orders.id))
        .leftJoin(partners, eq(supportTickets.partnerId, partners.id))
        .where(and(...conditions))
        .orderBy(desc(supportTickets.createdAt))
        .limit(perPage)
        .offset(offset)
    ])

    return {
      items: rows.map(r => ({
        ...r.ticket,
        customerName: r.customerName,
        vendorName: r.vendorName,
        orderNumber: r.orderNumber
      })),
      total: totalResult[0]?.total ?? 0,
      page,
      perPage
    }
  }

  async updateTicket(tenantId: string, id: string, next: Partial<typeof supportTickets.$inferSelect>): Promise<SupportTicket> {
    const [row] = await this.db
      .update(supportTickets)
      .set({ ...next, updatedAt: new Date() })
      .where(and(eq(supportTickets.tenantId, tenantId), eq(supportTickets.id, id)))
      .returning()
    return row
  }
}
