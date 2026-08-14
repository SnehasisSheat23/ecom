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
  email: string
  phone: string | null
  city: string
  line1: string
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

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

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
  fullName?: string
  email?: string
  city?: string
  phone?: string
  line1?: string
  line2?: string | null
  address?: string
  state?: string
  postalCode?: string
  pincode?: string
  country?: string
}

interface BackendOrder {
  id: string
  orderNumber?: string
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

  const status = item.status || "PENDING"
  if (status === "DELIVERED" || status === "SHIPPED") {
    paymentStatus = "Paid"
    fulfillmentStatus = "Fulfilled"
  } else if (status === "CONFIRMED" || status === "PROCESSING") {
    paymentStatus = "Paid"
    fulfillmentStatus = "Unfulfilled"
  } else if (status === "CANCELLED") {
    paymentStatus = "Refunded"
    fulfillmentStatus = "Unfulfilled"
  }

  const shippingAddress = item.shippingAddressSnapshot || {}
  const custRec = item.customerRecord
  const fullName = custRec 
    ? `${custRec.firstName || ''} ${custRec.lastName || ''}`.trim() || shippingAddress.fullName || "Valued Customer"
    : shippingAddress.fullName || "Valued Customer"
  const email = item.guestEmail || custRec?.email || shippingAddress.email || "guest@example.com"
  const phone = custRec?.phone || shippingAddress.phone || (item.metadata?.altPhone as string) || null

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
      email: email,
      phone: phone,
      line1: shippingAddress.line1 || shippingAddress.address || "No address line provided",
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
    status: status as OrderStatus,
    shippingMethodName: item.shippingMethodSnapshot?.name || item.shippingMethodSnapshot?.label || (meta.deliveryType as string) || "Standard Delivery",
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
      return { title: "Status Unknown", desc: "No detail available" }
  }
}

interface StatusAction {
  label: string
  nextStatus: OrderStatus
  icon?: string
}

const getStatusActions = (status: OrderStatus): StatusAction[] => {
  switch (status) {
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
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full select-none bg-muted text-muted-foreground leading-none flex items-center justify-center">
            {orderStatus.charAt(0) + orderStatus.slice(1).toLowerCase()} {mounted ? new Date(order.date).toLocaleString("en-US", { month: "short", day: "numeric" }) : "—"}
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
              <CardTitle className="text-base font-semibold font-heading text-foreground">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-normal">Contact information</span>
                <span className="text-sm font-semibold text-foreground">{order.customer.name}</span>
                <span className="text-sm font-medium text-foreground">{order.customer.email}</span>
                {order.customer.phone && (
                  <span className="text-sm font-medium text-foreground font-mono">{order.customer.phone}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-normal">Payment</span>
                <span className="text-sm font-medium text-foreground leading-relaxed">
                  {order.metadata?.paymentId ? `Online Payment (${order.metadata.paymentId})` : "Online Payment"}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">Billing address same as shipping</span>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-muted-foreground font-normal">Shipping address</span>
                <span className="text-sm font-semibold text-foreground">{order.customer.name}</span>
                <span className="text-sm font-medium text-foreground leading-relaxed">{order.customer.line1}</span>
                <span className="text-sm font-medium text-foreground leading-relaxed">
                  {order.customer.city}, {order.customer.state} {order.customer.postalCode}
                </span>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-muted-foreground font-normal">Shipping method</span>
                <span className="text-sm font-medium text-foreground leading-relaxed">{order.shippingMethodName}</span>
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
