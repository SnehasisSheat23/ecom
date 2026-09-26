export type NotificationChannel = 'email' | 'whatsapp' | 'sms' | 'system'

export type NotificationEvent =
  | 'ORDER_PLACED'
  | 'ORDER_STATUS_CHANGED'
  | 'B2B_QUOTATION_REQUESTED'
  | 'B2B_QUOTATION_RESPONDED'
  | 'ADMIN_PASSWORD_RESET'
  | 'CUSTOMER_WELCOME'

export interface OrderItemSummary {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sku?: string
  image?: string
}

export interface OrderPlacedPayload {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  totalAmount: number | string
  subtotal?: number | string | null
  shippingCost?: number | string | null
  currency: string
  paymentMethod?: string | null
  shippingAddress?: string | null
  items: OrderItemSummary[]
  trackingUrl?: string | null
}

export interface OrderStatusChangedPayload {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  oldStatus?: string | null
  newStatus: string
  currency?: string
  totalAmount?: number | string
  trackingNumber?: string | null
  trackingUrl?: string | null
}

export interface QuotationRequestedPayload {
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  companyName?: string | null
  currency: string
  totalAmount?: number | string
  itemsCount: number
  customerNotes?: string | null
}

export interface QuotationRespondedPayload {
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  currency: string
  subtotal: number | string
  totalAmount: number | string
  validUntil?: string | Date | null
  paymentLink?: string | null
  adminNotes?: string | null
}

export interface AdminPasswordResetPayload {
  email: string
  adminName?: string
  resetToken: string
  resetUrl: string
  expiresInMinutes?: number
}

export interface CustomerWelcomePayload {
  customerName: string
  customerEmail: string
  companyName?: string
}

export type NotificationPayloadMap = {
  ORDER_PLACED: OrderPlacedPayload
  ORDER_STATUS_CHANGED: OrderStatusChangedPayload
  B2B_QUOTATION_REQUESTED: QuotationRequestedPayload
  B2B_QUOTATION_RESPONDED: QuotationRespondedPayload
  ADMIN_PASSWORD_RESET: AdminPasswordResetPayload
  CUSTOMER_WELCOME: CustomerWelcomePayload
}

export interface OutgoingEmailMessage {
  to: string
  toName?: string
  from?: string
  subject: string
  html: string
  text: string
}

export interface OutgoingWhatsAppMessage {
  to: string
  message: string
}

export interface OutgoingSystemMessage {
  title: string
  content: string
  metadata?: Record<string, any>
}

export interface AdapterResult {
  success: boolean
  channel: NotificationChannel
  provider: string
  messageId?: string
  error?: string
}

export interface NotificationAdapter {
  readonly channel: NotificationChannel
  readonly name: string
  sendEmail?(msg: OutgoingEmailMessage): Promise<AdapterResult>
  sendWhatsApp?(msg: OutgoingWhatsAppMessage): Promise<AdapterResult>
  sendSystem?(msg: OutgoingSystemMessage): Promise<AdapterResult>
}

export interface NotifyOptions {
  /** If true, awaits adapter responses. Default is false (fire-and-forget) */
  sync?: boolean
  /** Filter to specific channels only, e.g. ['email'] */
  channels?: NotificationChannel[]
}
