import { AppError } from '../../lib/errors.js'
import type { AuthenticatedCustomer } from '../customers/customers.types.js'
import { SupportRepository } from './support.repository.js'
import type {
  CreateTicketInput,
  AddMessageInput,
  UpdateTicketInput,
  SupportTicket,
  SupportMessage,
  SupportTicketWithDetails,
  TicketStatus,
  SupportSenderType
} from './support.types.js'
import { PaginatedResult } from '../../lib/types.js'

export class SupportService {
  constructor(private readonly repository: SupportRepository) {}

  async createTicket(actor: AuthenticatedCustomer, input: CreateTicketInput): Promise<SupportTicket> {
    return this.repository.transaction(async (txRepo) => {
      const ticket = await txRepo.createTicket({
        tenantId: actor.tenantId,
        customerId: actor.customerId,
        orderId: input.orderId,
        partnerId: input.partnerId ?? null,
        subject: input.subject,
        type: input.type,
        priority: input.priority ?? 'MEDIUM',
        status: 'OPEN',
      })

      await txRepo.createMessage({
        tenantId: actor.tenantId,
        ticketId: ticket.id,
        senderId: actor.customerId,
        senderType: 'CUSTOMER',
        content: input.initialMessage,
        attachments: input.attachments ?? [],
      })

      return ticket
    })
  }

  async addMessage(actor: AuthenticatedCustomer, ticketId: string, input: AddMessageInput): Promise<SupportMessage> {
    return this.repository.transaction(async (txRepo) => {
      const ticket = await txRepo.findTicketById(actor.tenantId, ticketId)
      if (!ticket) {
        throw new AppError('Ticket not found', 404, 'ticket-not-found')
      }

      if (ticket.status === 'CLOSED') {
        throw new AppError('Cannot reply to a closed ticket', 409, 'ticket-closed')
      }

      const senderType = this.determineSenderType(actor, ticket)
      
      if (senderType === 'CUSTOMER' && ticket.customerId !== actor.customerId) {
        throw new AppError('Forbidden', 403, 'forbidden')
      }
      if (senderType === 'VENDOR' && ticket.partnerId !== actor.activePartnerId) {
        throw new AppError('Forbidden', 403, 'forbidden')
      }

      const message = await txRepo.createMessage({
        tenantId: actor.tenantId,
        ticketId: ticket.id,
        senderId: actor.customerId,
        senderType,
        content: input.content,
        attachments: input.attachments ?? [],
      })

      if (senderType === 'ADMIN' || senderType === 'VENDOR') {
        await txRepo.updateTicket(actor.tenantId, ticket.id, { status: 'PENDING_CUSTOMER' })
      } else if (senderType === 'CUSTOMER') {
        await txRepo.updateTicket(actor.tenantId, ticket.id, { status: 'OPEN' })
      }

      return message
    })
  }

  async getTicket(actor: AuthenticatedCustomer, ticketId: string): Promise<SupportTicketWithDetails> {
    const ticket = await this.repository.getTicketWithDetails(actor.tenantId, ticketId)
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'ticket-not-found')
    }

    const senderType = this.determineSenderType(actor, ticket)
    if (senderType === 'CUSTOMER' && ticket.customerId !== actor.customerId) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }
    if (senderType === 'VENDOR' && ticket.partnerId !== actor.activePartnerId) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    return ticket
  }

  async listCustomerTickets(actor: AuthenticatedCustomer, page?: number, perPage?: number): Promise<PaginatedResult<SupportTicketWithDetails>> {
    return this.repository.listTickets(actor.tenantId, {
      customerId: actor.customerId,
      page,
      perPage
    })
  }

  async listVendorTickets(actor: AuthenticatedCustomer, page?: number, perPage?: number): Promise<PaginatedResult<SupportTicketWithDetails>> {
    if (!actor.activePartnerId) {
      throw new AppError('Active vendor context required', 403, 'forbidden')
    }
    return this.repository.listTickets(actor.tenantId, {
      partnerId: actor.activePartnerId,
      page,
      perPage
    })
  }

  async listAdminTickets(actor: AuthenticatedCustomer, filters: { partnerId?: string | null, status?: TicketStatus, page?: number, perPage?: number }): Promise<PaginatedResult<SupportTicketWithDetails>> {
    if (!actor.isAdmin && !actor.isSuperAdmin) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }
    return this.repository.listTickets(actor.tenantId, filters)
  }

  async updateTicketStatus(actor: AuthenticatedCustomer, ticketId: string, input: UpdateTicketInput): Promise<SupportTicket> {
    const ticket = await this.repository.findTicketById(actor.tenantId, ticketId)
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'ticket-not-found')
    }

    const isVendor = ticket.partnerId && actor.activePartnerId === ticket.partnerId
    const isAdmin = actor.isAdmin || actor.isSuperAdmin

    if (!isVendor && !isAdmin) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    return this.repository.updateTicket(actor.tenantId, ticket.id, input)
  }

  private determineSenderType(actor: AuthenticatedCustomer, ticket: SupportTicket): SupportSenderType {
    if (actor.isAdmin || actor.isSuperAdmin) return 'ADMIN'
    if (actor.activePartnerId && ticket.partnerId === actor.activePartnerId) return 'VENDOR'
    return 'CUSTOMER'
  }
}
