"use client"

import * as React from "react"
import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import ordersData from "@/app/dashboard/orders.json"
import { apiRequest } from "@/lib/api-client"
import { formatPrice } from "@/lib/currency"
import { toast } from "sonner"

interface Customer {
  name: string
  company?: string
  taxNumber?: string
  email: string
  phone: string | null
  city: string
  line1: string
  schedule?: string
  state: string
  postalCode: string
  country: string
}

interface LineItem {
  name: string
  variantTitle?: string | null
  sku: string
  qty: number
  price: number
  imageUrl?: string | null
  metadata?: Record<string, unknown>
}

type OrderStatus = 'PENDING' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

interface Order {
  id: string
  date: string
  customer: Customer
  items: LineItem[]
  paymentStatus: "Paid" | "Pending" | "Refunded"
  fulfillmentStatus: "Fulfilled" | "Unfulfilled" | "Partially Fulfilled"
  total: number
  subtotal: number
  shippingAmount: number
  discountAmount: number
  notes?: string | null
  currency?: string
  orderNumber?: string
  status?: OrderStatus
  shippingMethodName?: string
  paymentMethodType?: string
  poDocumentUrl?: string | null
  poNumber?: string | null
  paymentReceiptUrl?: string | null
  quotationId?: string | null
  metadata?: {
    cakeMessage?: string | null
    deliveryDate?: string | null
    deliveryTime?: string | null
    deliveryType?: string | null
    deliveryInstructions?: string | null
    paymentId?: string | null
    legacyOrderId?: string | null
    altPhone?: string | null
    ipAddress?: string | null
  }
}

interface CustomerRecord {
  id?: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  companyName?: string | null
  companyTaxId?: string | null
  crNumber?: string | null
}

interface BackendOrderItem {
  productTitle?: string | null
  variantTitle?: string | null
  sku?: string | null
  quantity?: number
  unitPrice?: number
  imageUrl?: string | null
  metadata?: Record<string, unknown>
}

interface BackendAddressSnapshot {
  name?: string
  fullName?: string
  company?: string
  taxNumber?: string
  email?: string
  city?: string
  phone?: string
  line1?: string
  line2?: string | null
  address?: string
  deliverySite?: string
  notes?: string
  state?: string
  postalCode?: string
  pincode?: string
  country?: string
}

interface BackendOrder {
  id: string
  orderNumber?: string
  customerName?: string
  customerEmail?: string
  status?: string
  guestEmail?: string | null
  shippingAddressSnapshot?: BackendAddressSnapshot | null
  shippingMethodSnapshot?: { name?: string; label?: string } | null
  subtotal?: number
  shippingAmount?: number
  discountAmount?: number
  total?: number
  notes?: string | null
  createdAt?: string
  metadata?: Record<string, unknown>
  currency?: string
  items?: BackendOrderItem[]
  customerRecord?: CustomerRecord | null
}

const mapBackendOrderToFrontend = (item: BackendOrder): Order => {
  let paymentStatus: "Paid" | "Pending" | "Refunded" = "Pending"
  let fulfillmentStatus: "Fulfilled" | "Unfulfilled" | "Partially Fulfilled" = "Unfulfilled"

  const rawStatus = (item.status || "PENDING").toUpperCase()
  let mappedStatus: OrderStatus = 'PENDING'

  if (rawStatus === 'PENDING_PAYMENT') {
    mappedStatus = 'PENDING_PAYMENT'
    paymentStatus = 'Pending'
    fulfillmentStatus = 'Unfulfilled'
  } else if (rawStatus === 'CONFIRMED' || rawStatus === 'PROCESSING') {
    mappedStatus = rawStatus as OrderStatus
    paymentStatus = 'Paid'
    fulfillmentStatus = 'Unfulfilled'
  } else if (rawStatus === 'SHIPPED' || rawStatus === 'DELIVERED') {
    mappedStatus = rawStatus as OrderStatus
    paymentStatus = 'Paid'
    fulfillmentStatus = rawStatus === 'DELIVERED' ? 'Fulfilled' : 'Partially Fulfilled'
  } else if (rawStatus === 'CANCELLED') {
    mappedStatus = 'CANCELLED'
    paymentStatus = 'Refunded'
    fulfillmentStatus = 'Unfulfilled'
  } else {
    mappedStatus = 'PENDING'
  }

  const shippingAddress = item.shippingAddressSnapshot || {}
  const custRec = item.customerRecord
  const fullName = shippingAddress.name || shippingAddress.fullName || (custRec ? `${custRec.firstName || ''} ${custRec.lastName || ''}`.trim() : "") || item.customerName || "Valued Client"
  const company = shippingAddress.company || custRec?.companyName || ""
  const taxNumber = shippingAddress.taxNumber || custRec?.companyTaxId || custRec?.crNumber || ""
  const email = shippingAddress.email || custRec?.email || item.guestEmail || "client@example.com"
  const phone = shippingAddress.phone || custRec?.phone || (item.metadata?.altPhone as string) || null

  // Cleanly parse delivery destination & timeline from notes/deliverySite
  const rawNotes = shippingAddress.notes || shippingAddress.line1 || shippingAddress.address || ""
  let parsedDeliverySite = shippingAddress.deliverySite || ""
  let parsedSchedule = ""
  let cleanAddress = ""

  if (rawNotes) {
    const rawLines = String(rawNotes).split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of rawLines) {
      if (line.toLowerCase().startsWith('delivery destination / site:') || line.toLowerCase().startsWith('delivery site:')) {
        parsedDeliverySite = line.substring(line.indexOf(':') + 1).trim()
      } else if (line.toLowerCase().startsWith('required delivery schedule:') || line.toLowerCase().startsWith('required timeline:')) {
        parsedSchedule = line.substring(line.indexOf(':') + 1).trim()
      } else if (!line.includes('🎯') && !line.includes('•') && !line.toLowerCase().includes('target') && !line.toLowerCase().startsWith('delivery destination') && !line.toLowerCase().startsWith('delivery site')) {
        cleanAddress = line
      }
    }
  }

  const destination = parsedDeliverySite || cleanAddress || (company ? `Company Facility: ${company}` : "Commercial Delivery Site")

  const items: LineItem[] = (item.items || []).map((li: any) => {
    const title = li.productTitle || li.name || li.productNameSnapshot?.en || li.productNameSnapshot?.title || li.sku || "Product Item"
    const priceVal = parseFloat(String(li.unitPrice || li.price || 0))
    const img = li.imageUrl || li.image || li.productNameSnapshot?.imageUrl || li.productNameSnapshot?.image || "https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/extra-virgin-olive-oil.jpg"

    return {
      name: title,
      variantTitle: li.variantTitle || null,
      sku: li.sku || "PROD-SKU",
      qty: li.quantity || li.qty || 1,
      price: priceVal,
      imageUrl: img,
      metadata: li.metadata || {},
    }
  })

  const meta = (item.metadata || {}) as Record<string, unknown>

  const subtotalVal = parseFloat(String(item.subtotal || 0))
  const shippingVal = parseFloat(String(item.shippingAmount || (item as any).shippingCost || 0))
  const totalVal = parseFloat(String(item.total || (item as any).totalAmount || 0))

  return {
    id: item.id,
    date: item.createdAt || new Date().toISOString(),
    customer: {
      name: fullName,
      company: company || undefined,
      taxNumber: taxNumber || undefined,
      email: email,
      phone: phone,
      line1: destination,
      schedule: parsedSchedule || undefined,
      city: shippingAddress.city || "",
      state: shippingAddress.state || "",
      postalCode: shippingAddress.postalCode || shippingAddress.pincode || "",
      country: shippingAddress.country || "",
    },
    items,
    paymentStatus,
    fulfillmentStatus,
    subtotal: subtotalVal,
    shippingAmount: shippingVal,
    discountAmount: Number(item.discountAmount || 0),
    total: totalVal,
    notes: item.notes || null,
    currency: item.currency || "AED",
    orderNumber: item.orderNumber || item.id,
    status: mappedStatus,
    shippingMethodName: item.shippingMethodSnapshot?.name || item.shippingMethodSnapshot?.label || (meta.deliveryType as string) || "Standard Delivery",
    paymentMethodType: (item as any).paymentMethodType || "CARD",
    poDocumentUrl: (item as any).poDocumentUrl || null,
    poNumber: (item as any).poNumber || null,
    paymentReceiptUrl: (item as any).paymentReceiptUrl || null,
    quotationId: (item as any).quotationId || null,
    metadata: {
      cakeMessage: (meta.cakeMessage as string) || null,
      deliveryDate: (meta.deliveryDate as string) || null,
      deliveryTime: (meta.deliveryTime as string) || null,
      deliveryType: (meta.deliveryType as string) || null,
      deliveryInstructions: (meta.deliveryInstructions as string) || null,
      paymentId: (meta.paymentId as string) || null,
      legacyOrderId: (meta.legacyOrderId as string) || null,
      altPhone: (meta.altPhone as string) || null,
      ipAddress: (meta.ipAddress as string) || (meta.ip_address as string) || null,
    },
  }
}

const deriveStatus = (paymentStatus: string, fulfillmentStatus: string): OrderStatus => {
  if (fulfillmentStatus === "Fulfilled") return "DELIVERED"
  if (fulfillmentStatus === "Partially Fulfilled") return "SHIPPED"
  if (paymentStatus === "Paid") return "CONFIRMED"
  if (paymentStatus === "Refunded") return "CANCELLED"
  return "PENDING"
}

const getProgressBarProps = (status: OrderStatus) => {
  switch (status) {
    case 'PENDING_PAYMENT':
      return { width: 'w-[15%]', color: 'bg-amber-500' }
    case 'PENDING':
      return { width: 'w-[20%]', color: 'bg-primary' }
    case 'CONFIRMED':
      return { width: 'w-[40%]', color: 'bg-primary' }
    case 'PROCESSING':
      return { width: 'w-[60%]', color: 'bg-primary' }
    case 'SHIPPED':
      return { width: 'w-[80%]', color: 'bg-amber-500' }
    case 'DELIVERED':
      return { width: 'w-full', color: 'bg-emerald-500' }
    case 'CANCELLED':
      return { width: 'w-full', color: 'bg-zinc-400' }
    default:
      return { width: 'w-0', color: 'bg-muted' }
  }
}

const getStatusCardText = (status: OrderStatus) => {
  switch (status) {
    case 'PENDING_PAYMENT':
      return { title: "Payment Pending", desc: "Awaiting wire transfer slip or invoice settlement" }
    case 'PENDING':
      return { title: "Order Placed", desc: "Awaiting confirmation" }
    case 'CONFIRMED':
      return { title: "Confirmed", desc: "Ready to be processed" }
    case 'PROCESSING':
      return { title: "Processing", desc: "Being prepared for shipment" }
    case 'SHIPPED':
      return { title: "Shipped", desc: "Out for delivery" }
    case 'DELIVERED':
      return { title: "Delivered", desc: "Successfully delivered" }
    case 'CANCELLED':
      return { title: "Cancelled", desc: "This order was cancelled" }
    default:
      return { title: "Order Placed", desc: "Processing details" }
  }
}

interface StatusAction {
  label: string
  nextStatus: OrderStatus
  icon?: string
}

const getStatusActions = (status: OrderStatus): StatusAction[] => {
  switch (status) {
    case 'PENDING_PAYMENT':
      return [
        { label: "Confirm Payment Received", nextStatus: "CONFIRMED", icon: "check_circle" },
        { label: "Cancel Order", nextStatus: "CANCELLED", icon: "cancel" }
      ]
    case 'PENDING':
      return [
        { label: "Confirm Order", nextStatus: "CONFIRMED", icon: "check_circle" },
        { label: "Cancel Order", nextStatus: "CANCELLED", icon: "cancel" }
      ]
    case 'CONFIRMED':
      return [
        { label: "Start Processing", nextStatus: "PROCESSING", icon: "settings" },
        { label: "Cancel Order", nextStatus: "CANCELLED", icon: "cancel" }
      ]
    case 'PROCESSING':
      return [
        { label: "Mark as Shipped", nextStatus: "SHIPPED", icon: "local_shipping" }
      ]
    case 'SHIPPED':
      return [
        { label: "Mark as Delivered", nextStatus: "DELIVERED", icon: "check" }
      ]
    default:
      return []
  }
}

const getStatusActionStyle = (nextStatus: OrderStatus) => {
  switch (nextStatus) {
    case 'CONFIRMED':
    case 'DELIVERED':
      return "bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 hover:text-emerald-700 border-emerald-500/20 hover:border-emerald-500/35 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
    case 'PROCESSING':
      return "bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 hover:text-blue-700 border-blue-500/20 hover:border-blue-500/35 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30"
    case 'SHIPPED':
      return "bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 hover:text-amber-700 border-amber-500/20 hover:border-amber-500/35 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
    case 'CANCELLED':
      return "bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 hover:text-rose-700 border-rose-500/20 hover:border-rose-500/35 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
    default:
      return ""
  }
}

export function OrderDetails({ id }: { id: string }) {
  const [mounted, setMounted] = React.useState(false)
  const [order, setOrder] = React.useState<Order | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [fulfillmentStatus, setFulfillmentStatus] = React.useState<Order["fulfillmentStatus"]>("Unfulfilled")
  const [orderStatus, setOrderStatus] = React.useState<OrderStatus>("PENDING")
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)
  const [updatingToStatus, setUpdatingToStatus] = React.useState<OrderStatus | null>(null)

  const handleUpdateStatus = async (nextStatus: OrderStatus) => {
    setIsUpdatingStatus(true)
    setUpdatingToStatus(nextStatus)
    try {
      const res = await apiRequest(`/admin/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        toast.success(`Order status updated to ${nextStatus.toLowerCase()}`)
        setOrderStatus(nextStatus)
        if (nextStatus === "DELIVERED" || nextStatus === "SHIPPED") {
          setFulfillmentStatus("Fulfilled")
        } else {
          setFulfillmentStatus("Unfulfilled")
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to update order status")
      }
    } catch (err) {
      console.error(err)
      const errorMessage = err instanceof Error ? err.message : "Something went wrong while updating order status"
      toast.error(errorMessage)
    } finally {
      setIsUpdatingStatus(false)
      setUpdatingToStatus(null)
    }
  }

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 0)

    apiRequest(`/admin/orders/${id}`)
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw new Error("Failed to fetch order details")
      })
      .then((json) => {
        if (json.data) {
          const mapped = mapBackendOrderToFrontend(json.data)
          setOrder(mapped)
          setFulfillmentStatus(mapped.fulfillmentStatus)
          setOrderStatus(mapped.status || "PENDING")
        } else {
          throw new Error("No data returned")
        }
      })
      .catch((err) => {
        console.error("Failed to load order from backend:", err)
        setOrder(null)
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => clearTimeout(timer)
  }, [id])

  if (isLoading) {
    return (
      <div className="flex flex-col h-full font-ui min-h-0">
        <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center gap-3.5 shrink-0">
          <div className="size-8 rounded-lg bg-muted/30 animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-6 w-32 bg-muted/30 animate-pulse rounded" />
            <div className="h-5 w-28 bg-muted/20 animate-pulse rounded-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-1.5 flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full flex flex-col gap-6">
            <Card className="animate-pulse w-full">
              <CardHeader className="pb-2">
                <div className="h-4 w-28 bg-muted/30 rounded" />
                <div className="h-3 w-40 bg-muted/20 rounded mt-1.5" />
              </CardHeader>
              <CardContent className="flex flex-col gap-5 py-2">
                <div className="h-2 w-full max-w-[280px] bg-muted/20 rounded-full mt-1" />
                <div className="h-12 w-full bg-muted/10 rounded-lg mt-2" />
              </CardContent>
            </Card>

            <Card className="animate-pulse w-full">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="h-4 w-36 bg-muted/30 rounded" />
                <div className="h-3 w-60 bg-muted/20 rounded mt-1.5" />
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <div className="h-3.5 w-28 bg-muted/30 rounded" />
                    <div className="h-3 w-40 bg-muted/20 rounded mt-0.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="w-full lg:w-[400px] shrink-0 flex flex-col gap-6">
            <Card className="animate-pulse w-full">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="h-4 w-28 bg-muted/30 rounded" />
                <div className="h-3 w-36 bg-muted/20 rounded mt-1.5" />
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 font-ui">
        <div className="text-center max-w-sm flex flex-col items-center gap-3">
          <div className="p-3 bg-muted/40 rounded-full">
            <Icon name="warning" className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Order Not Found</h2>
          <p className="text-sm text-muted-foreground leading-normal">
            The order ID &quot;{id}&quot; could not be found or has been deleted from your store records.
          </p>
          <Link href="/dashboard/orders" className="mt-2">
            <Button size="sm" className="cursor-pointer">Back to Orders List</Button>
          </Link>
        </div>
      </div>
    )
  }

  const formatHeaderOrderNum = (num?: string) => {
    if (!num) return id
    if (num.startsWith('#')) return num
    return `#${num}`
  }

  return (
    <div className="flex flex-col h-full font-ui min-h-0">
      {/* Top Navigation / Header */}
      <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center gap-3.5 shrink-0">
        <Link
          href="/dashboard/orders"
          className="text-muted-foreground hover:text-foreground duration-200 flex items-center justify-center size-8 rounded-lg hover:bg-muted/60 transition-colors"
        >
          <Icon name="arrow_back" className="size-5 text-[20px]" />
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold font-heading text-foreground tracking-tight leading-none">
            Order {formatHeaderOrderNum(order.orderNumber)}
          </h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full select-none leading-none flex items-center justify-center ${
            orderStatus === 'PENDING_PAYMENT' 
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
              : (orderStatus === 'CONFIRMED' || orderStatus === 'DELIVERED' 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' 
                : (orderStatus === 'PROCESSING' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'bg-muted text-muted-foreground'))
          }`}>
            {orderStatus === 'PENDING_PAYMENT' ? 'Payment Pending' : (orderStatus.charAt(0) + orderStatus.slice(1).toLowerCase())} • {mounted ? new Date(order.date).toLocaleString("en-US", { month: "short", day: "numeric" }) : "—"}
          </span>
        </div>
      </div>

      {/* Main Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-1.5 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column */}
        <div className="flex-1 w-full flex flex-col gap-6">
          {/* Status Block */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold font-heading text-foreground">
                {getStatusCardText(orderStatus).title}
              </CardTitle>
              <CardDescription>{order.shippingMethodName}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 py-2">
              {/* Progress Bar */}
              <div className="h-2 w-full max-w-[280px] bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${getProgressBarProps(orderStatus).color} ${getProgressBarProps(orderStatus).width}`}></div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <Icon name="local_shipping" className="text-muted-foreground size-5! shrink-0" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {getStatusCardText(orderStatus).desc}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {mounted ? new Date(order.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusActions(orderStatus).map((action) => (
                    <Button
                      key={action.nextStatus}
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(action.nextStatus)}
                      disabled={isUpdatingStatus}
                      className={`h-8 text-xs font-medium transition-colors cursor-pointer ${getStatusActionStyle(action.nextStatus)}`}
                    >
                      {action.icon && <Icon name={action.icon} className="size-3.5! mr-1" />}
                      {updatingToStatus === action.nextStatus ? "Updating..." : action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Cake Metadata Card */}
          {(order.metadata?.deliveryDate || order.metadata?.deliveryTime || order.metadata?.cakeMessage || order.notes) && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold font-heading text-foreground">Delivery & Cake Customization</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 text-sm">
                {order.metadata?.deliveryDate && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-normal">Requested Delivery Date</span>
                    <span className="text-sm font-medium text-foreground">{order.metadata.deliveryDate}</span>
                  </div>
                )}
                {order.metadata?.deliveryTime && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-normal">Time Slot</span>
                    <span className="text-sm font-medium text-foreground">{order.metadata.deliveryTime}</span>
                  </div>
                )}
                {order.metadata?.cakeMessage && (
                  <div className="flex flex-col gap-0.5 md:col-span-2">
                    <span className="text-xs text-muted-foreground font-normal">Cake Message</span>
                    <span className="text-sm font-medium text-foreground">{order.metadata.cakeMessage}</span>
                  </div>
                )}
                {order.notes && (
                  <div className="flex flex-col gap-0.5 md:col-span-2">
                    <span className="text-xs text-muted-foreground font-normal">Special Instructions</span>
                    <span className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{order.notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer Info Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Customer & Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Contact Person</span>
                <span className="text-sm font-semibold text-foreground">{order.customer.name}</span>
                <span className="text-sm font-medium text-foreground">{order.customer.email}</span>
                {order.customer.phone && (
                  <span className="text-sm font-medium text-foreground font-mono">{order.customer.phone}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Company & Invoicing</span>
                <span className="text-sm font-semibold text-foreground">{order.customer.company || "Individual / Retail"}</span>
                {order.customer.taxNumber && (
                  <span className="text-xs font-mono text-muted-foreground">TRN / Tax ID: {order.customer.taxNumber}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Payment Method & Terms</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                    order.paymentMethodType === 'CREDIT_TERMS' 
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                      : (order.paymentMethodType === 'PURCHASE_ORDER' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300' 
                        : (order.paymentMethodType === 'BANK_TRANSFER' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-muted text-foreground'))
                  }`}>
                    {order.paymentMethodType || 'Card / Online'}
                  </span>
                  {order.poNumber && (
                    <span className="text-xs font-mono font-medium text-foreground">PO: {order.poNumber}</span>
                  )}
                </div>
                {order.poDocumentUrl && (
                  <a
                    href={order.poDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1 font-medium"
                  >
                    <Icon name="attach_file" className="size-3.5" />
                    View Attached PO Document
                  </a>
                )}
                {order.paymentReceiptUrl && (
                  <a
                    href={order.paymentReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1 mt-1 font-medium"
                  >
                    <Icon name="receipt" className="size-3.5" />
                    View Bank Wire Transfer Slip
                  </a>
                )}
                {order.quotationId && (
                  <span className="text-[11px] text-muted-foreground mt-0.5">Origin: RFQ Quotation</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">Shipping Method</span>
                <span className="text-sm font-medium text-foreground leading-relaxed">{order.shippingMethodName}</span>
                {order.customer.schedule && (
                  <span className="text-xs text-muted-foreground mt-0.5">Schedule: {order.customer.schedule}</span>
                )}
              </div>

              <div className="flex flex-col gap-1 md:col-span-2 pt-3 border-t border-border/60">
                <span className="text-xs text-muted-foreground font-medium">Delivery Destination / Site</span>
                <span className="text-sm font-medium text-foreground leading-relaxed">{order.customer.line1}</span>
                {(order.customer.city || order.customer.state || order.customer.country) && (
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    {[order.customer.city, order.customer.state, order.customer.postalCode, order.customer.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Order Summary</CardTitle>
              <CardDescription>Items and price totals</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-4">
              {/* Items */}
              <div className="flex flex-col gap-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="size-12 bg-muted/40 border border-border/40 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                        ) : (
                          <Icon name="image" className="text-muted-foreground/40 size-5!" />
                        )}
                      </div>
                      <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground size-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                        {item.qty}
                      </div>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-xs font-medium text-foreground leading-normal truncate">{item.name}</span>
                      {item.variantTitle && (
                        <span className="text-[10px] text-muted-foreground font-medium">{item.variantTitle}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">SKU: {item.sku}</span>
                    </div>
                    <span className="text-xs font-medium text-foreground font-mono">{formatPrice(item.price, { currency: order.currency })}</span>
                  </div>
                ))}
              </div>

              <Separator className="bg-border/60" />

              {/* Summary details */}
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal • {order.items.reduce((acc, item) => acc + item.qty, 0)} items</span>
                  <span className="font-medium text-foreground font-mono">{formatPrice(order.subtotal || order.total, { currency: order.currency })}</span>
                </div>
                {order.shippingAmount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-foreground font-mono">{formatPrice(order.shippingAmount, { currency: order.currency })}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 font-mono">Free</span>
                  </div>
                )}
                {order.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 font-mono">-{formatPrice(order.discountAmount, { currency: order.currency })}</span>
                  </div>
                )}
              </div>

              <Separator className="bg-border/60" />

              {/* Total */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-semibold font-heading text-foreground">Total</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-heading text-foreground tabular-nums font-mono">{formatPrice(order.total, { currency: order.currency })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
