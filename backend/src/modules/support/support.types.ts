import { PaginatedResult } from '../../lib/types.js'

export type TicketType = 'REFUND_REQUEST' | 'MISSING_ITEM' | 'QUALITY_ISSUE' | 'INQUIRY' | 'OTHER'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED'
export type SupportSenderType = 'CUSTOMER' | 'VENDOR' | 'ADMIN'

export interface SupportTicket {
  id: string
  tenantId: string
  customerId: string
  orderId: string
  partnerId: string | null
  subject: string
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  createdAt: Date
  updatedAt: Date
}

export interface SupportMessage {
  id: string
  tenantId: string
  ticketId: string
  senderId: string
  senderType: SupportSenderType
  content: string
  attachments: string[]
  createdAt: Date
}

export interface SupportTicketWithDetails extends SupportTicket {
  customerName?: string
  vendorName?: string | null
  orderNumber?: string
  messages?: SupportMessage[]
}

export interface CreateTicketInput {
  orderId: string
  partnerId?: string | null
  subject: string
  type: TicketType
  priority?: TicketPriority
  initialMessage: string
  attachments?: string[]
}

export interface AddMessageInput {
  content: string
  attachments?: string[]
}

export interface UpdateTicketInput {
  status?: TicketStatus
  priority?: TicketPriority
}
