"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import customersData from "@/app/dashboard/customers.json"
import ordersData from "@/app/dashboard/orders.json"
import { apiRequest } from "@/lib/api-client"
import { formatPrice } from "@/lib/currency"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  ordersCount: number
  totalSpent: number
  lastOrderDate: string
  lastOrderId: string
  address: string
  city: string
  province: string
  zip: string
  country: string
  tags: string[]
  notes: string
  taxExempt: boolean
  marketingConsent: boolean
}

interface Order {
  id: string
  orderNumber?: string
  date: string
  customer?: {
    name?: string
    email?: string
    city?: string
  }
  paymentStatus: string
  fulfillmentStatus: string
  total: number
  currency?: string
}

interface BackendOrderSummary {
  id: string
  orderNumber: string
  status: string
  guestEmail?: string | null
  total: number
  currency?: string
  createdAt?: string
  customerName?: string
  customerEmail?: string
  customerCity?: string
}

const mapBackendOrderToFrontend = (item: BackendOrderSummary, defaultCurrency: string = "INR"): Order => {
  let paymentStatus = "Pending"
  let fulfillmentStatus = "Unfulfilled"

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

  return {
    id: item.id,
    orderNumber: item.orderNumber || item.id,
    date: item.createdAt || new Date().toISOString(),
    customer: {
      name: item.customerName || "Customer",
      email: item.customerEmail || "guest@example.com",
      city: item.customerCity || "Unknown",
    },
    paymentStatus,
    fulfillmentStatus,
    total: (item.total || 0) / 100,
    currency: item.currency || defaultCurrency,
  }
}

export function CustomerDetails({ id }: { id: string }) {
  const router = useRouter()
  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [initialCustomer, setInitialCustomer] = React.useState<Customer | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [tenantCurrency, setTenantCurrency] = React.useState<string>("INR")
  const [isLoading, setIsLoading] = React.useState(true)
  const [showToast, setShowToast] = React.useState(false)

  React.useEffect(() => {
    let active = true
    async function loadCustomerDetail() {
      setIsLoading(true)
      try {
        const res = await apiRequest(`/admin/customers/${id}`)
        if (res.ok) {
          const body = await res.json()
          if (active && body.data) {
            const c = body.data
            const mainAddress = (c.addresses || [])[0] || {}
            const formatted: Customer = {
              id: c.id,
              name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || "Valued Customer",
              email: c.email || "",
              phone: c.phone || "",
              ordersCount: 0,
              totalSpent: 0,
              lastOrderDate: "-",
              lastOrderId: "-",
              address: mainAddress.line1 || "",
              city: mainAddress.city || "",
              province: mainAddress.state || "",
              zip: mainAddress.postalCode || "",
              country: mainAddress.country || "IN",
              marketingConsent: false,
              taxExempt: false,
              tags: c.isAdmin ? ["Admin"] : [],
              notes: "",
            }

            setCustomer(formatted)
            setInitialCustomer(formatted)

            try {
              const emailParam = c.email ? `&customerEmail=${encodeURIComponent(c.email)}` : ""
              const ordersRes = await apiRequest(`/admin/orders/list-summary?customerId=${c.id}${emailParam}&perPage=100`)
              if (ordersRes.ok) {
                const ordersJson = await ordersRes.json()
                const fetchedCurrency = ordersJson.data?.currency || "INR"
                setTenantCurrency(fetchedCurrency)
                const backendItems = ordersJson.data?.items || []
                const mapped = backendItems.map((item: BackendOrderSummary) => mapBackendOrderToFrontend(item, fetchedCurrency))
                setOrders(mapped)
                formatted.ordersCount = mapped.length
                formatted.totalSpent = mapped.reduce((acc: number, o: Order) => acc + o.total, 0)
              }
            } catch (e) {
              console.error("Failed to load customer orders:", e)
            }
          }
        } else {
          const matched = (customersData as Customer[]).find(c => c.id === id)
          if (active && matched) {
            setCustomer(JSON.parse(JSON.stringify(matched)))
            setInitialCustomer(JSON.parse(JSON.stringify(matched)))
          }
        }
      } catch (err) {
        console.error("Failed to load customer details:", err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadCustomerDetail()
    return () => {
      active = false
    }
  }, [id])

  const hasChanges = React.useMemo(() => {
    if (!customer || !initialCustomer) return false
    return JSON.stringify(customer) !== JSON.stringify(initialCustomer)
  }, [customer, initialCustomer])

  const handleSave = () => {
    if (!customer) return
    setInitialCustomer(JSON.parse(JSON.stringify(customer)))
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  const handleDiscard = () => {
    if (!initialCustomer) return
    setCustomer(JSON.parse(JSON.stringify(initialCustomer)))
  }

  // Fetch orders matching this customer's email dynamically from orders database
  const linkedOrders = React.useMemo(() => {
    if (!customer) return []
    return orders.filter(
      o => o.customer?.email?.toLowerCase().trim() === customer.email?.toLowerCase().trim()
    )
  }, [customer, orders])

  if (isLoading) {
    return (
      <div className="flex flex-col h-full font-ui min-h-0">
        <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center gap-3.5 shrink-0">
          <div className="size-8 rounded-lg bg-muted/30 animate-pulse" />
          <div className="h-6 w-32 bg-muted/30 animate-pulse rounded" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-1.5 flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full flex flex-col gap-6">
            <Card className="animate-pulse w-full">
              <CardContent className="h-40 bg-muted/10 rounded-lg mt-6" />
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 font-ui">
        <div className="text-center max-w-sm flex flex-col items-center gap-3">
          <div className="p-3 bg-muted/40 rounded-full">
            <Icon name="group" className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Customer Not Found</h2>
          <p className="text-sm text-muted-foreground leading-normal">
            The customer with ID &quot;{id}&quot; could not be found in your store records.
          </p>
          <Link href="/dashboard/customers" className="mt-2">
            <Button size="sm" className="cursor-pointer">Back to Customers</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full font-ui min-h-0">
      {/* Top Navigation / Header */}
      <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard/customers"
            className="text-muted-foreground hover:text-foreground duration-200 flex items-center justify-center size-8 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <Icon name="arrow_back" className="size-5 text-[20px]" />
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-heading text-foreground tracking-tight leading-none">{customer.name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 shadow-xs cursor-pointer"
            disabled={!hasChanges}
            onClick={handleDiscard}
          >
            Discard
          </Button>
          <Button 
            size="sm" 
            className="h-8 shadow-xs bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer"
            disabled={!hasChanges}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-1.5 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column */}
        <div className="flex-1 w-full flex flex-col gap-6">
          
          {/* General Information Card */}
          <Card>
            <CardContent className="pt-6 flex flex-col gap-4">
              <h3 className="font-semibold text-sm text-foreground select-none">General Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">Full Name</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={customer.name}
                    onChange={(e) => setCustomer(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">Email address</label>
                  <input
                    type="email"
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={customer.email}
                    onChange={(e) => setCustomer(prev => prev ? { ...prev, email: e.target.value } : null)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">Phone number</label>
                  <input
                    type="tel"
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={customer.phone}
                    onChange={(e) => setCustomer(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardContent className="pt-6 flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-foreground">Notes</label>
              <textarea
                className="min-h-24 w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                placeholder="Add notes about this customer..."
                value={customer.notes}
                onChange={(e) => setCustomer(prev => prev ? { ...prev, notes: e.target.value } : null)}
              />
              <span className="text-xs text-muted-foreground">Notes are only visible to store staff.</span>
            </CardContent>
          </Card>

          {/* Linked Orders Table Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Past Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {linkedOrders.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No orders found for this customer.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-muted-foreground text-xs font-medium uppercase">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Fulfillment</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {linkedOrders.map((order, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                      >
                        <td className="px-4 py-3 font-semibold text-primary font-mono">#{order.orderNumber || order.id}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            order.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-400"
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            order.fulfillmentStatus === "Fulfilled" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                          }`}>
                            {order.fulfillmentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground font-mono">
                          {formatPrice(order.total, { currency: order.currency || tenantCurrency })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
          
          {/* Default Address Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Default Address</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground">Street address</label>
                <input
                  type="text"
                  className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={customer.address}
                  onChange={(e) => setCustomer(prev => prev ? { ...prev, address: e.target.value } : null)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground">City</label>
                <input
                  type="text"
                  className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={customer.city}
                  onChange={(e) => setCustomer(prev => prev ? { ...prev, city: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-foreground">State/Province</label>
                  <input
                    type="text"
                    className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={customer.province}
                    onChange={(e) => setCustomer(prev => prev ? { ...prev, province: e.target.value } : null)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-foreground">ZIP code</label>
                  <input
                    type="text"
                    className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={customer.zip}
                    onChange={(e) => setCustomer(prev => prev ? { ...prev, zip: e.target.value } : null)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground">Country</label>
                <input
                  type="text"
                  className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={customer.country}
                  onChange={(e) => setCustomer(prev => prev ? { ...prev, country: e.target.value } : null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3 text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border cursor-pointer"
                  checked={!!customer.marketingConsent}
                  onChange={(e) => setCustomer(prev => prev ? { ...prev, marketingConsent: e.target.checked } : null)}
                />
                <span className="text-[13px] font-medium text-foreground">Marketing emails consented</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border cursor-pointer"
                  checked={!!customer.taxExempt}
                  onChange={(e) => setCustomer(prev => prev ? { ...prev, taxExempt: e.target.checked } : null)}
                />
                <span className="text-[13px] font-medium text-foreground">Tax exempt customer</span>
              </label>
            </CardContent>
          </Card>

          {/* Customer Tags Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Tags</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {customer.tags && customer.tags.map((tag, idx) => (
                  <div key={idx} className="bg-muted px-2 py-0.5 rounded-md text-xs font-medium text-foreground flex items-center gap-1.5 select-none animate-in duration-200">
                    {tag}
                    <Icon 
                      name="close" 
                      className="size-3 text-muted-foreground cursor-pointer hover:text-foreground" 
                      onClick={() => {
                        setCustomer(prev => {
                          if (!prev || !prev.tags) return prev
                          return {
                            ...prev,
                            tags: prev.tags.filter((_, i) => i !== idx)
                          }
                        })
                      }}
                    />
                  </div>
                ))}
                <input
                  type="text"
                  placeholder="Add tag..."
                  className="h-6 px-2 py-0.5 text-xs bg-background border border-dashed border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-20 placeholder:text-muted-foreground/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = e.currentTarget.value.trim()
                      if (val) {
                        setCustomer(prev => {
                          const tags = prev?.tags || []
                          if (tags.includes(val)) return prev
                          return prev ? { ...prev, tags: [...tags, val] } : null
                        })
                        e.currentTarget.value = ""
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Save Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <Icon name="check_circle" className="size-4" />
          <span className="text-sm font-medium">Customer profile saved successfully</span>
        </div>
      )}
    </div>
  )
}
