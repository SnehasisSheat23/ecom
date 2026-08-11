import { z } from 'zod'

export const createTicketSchema = z.object({
  orderId: z.string().uuid(),
  partnerId: z.string().uuid().nullable().optional(),
  subject: z.string().min(5).max(255),
  type: z.enum(['REFUND_REQUEST', 'MISSING_ITEM', 'QUALITY_ISSUE', 'INQUIRY', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  initialMessage: z.string().min(10),
  attachments: z.array(z.string().url()).optional(),
})

export const addMessageSchema = z.object({
  content: z.string().min(1),
  attachments: z.array(z.string().url()).optional(),
})

export const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
})

export const listTicketsQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  partnerId: z.string().optional(),
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  perPage: z.string().optional().transform(v => v ? parseInt(v) : 20),
})
