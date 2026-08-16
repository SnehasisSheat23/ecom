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
import { toast } from "sonner"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  companyName?: string
  companyTaxId?: string
  crNumber?: string
  customerGroup: "retail" | "wholesale" | "corporate"
  creditLimit: number
  availableCredit: number
  paymentTerms: "prepaid" | "net_15" | "net_30" | "net_60"
  accountDiscountPercent: number
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
    total: typeof item.total === 'number' ? item.total : parseFloat(String(item.total || '0')),
    currency: item.currency || defaultCurrency,
  }
}

export function CustomerDetails({ id }: { id: string }) {
  const router = useRouter()
  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [initialCustomer, setInitialCustomer] = React.useState<Customer | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [cartItems, setCartItems] = React.useState<any[]>([])
  const [wishlistItems, setWishlistItems] = React.useState<any[]>([])
  const [tenantCurrency, setTenantCurrency] = React.useState<string>("INR")
  const [isLoading, setIsLoading] = React.useState(true)

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
              companyName: c.companyName || "",
              companyTaxId: c.companyTaxId || "",
              crNumber: c.crNumber || "",
              customerGroup: c.customerGroup || "retail",
              creditLimit: Number(c.creditLimit || 0),
              availableCredit: Number(c.availableCredit || 0),
              paymentTerms: c.paymentTerms || "prepaid",
              accountDiscountPercent: Number(c.accountDiscountPercent || 0),
              ordersCount: 0,
              totalSpent: 0,
              lastOrderDate: "",
              lastOrderId: "",
              address: [mainAddress.addressLine1, mainAddress.addressLine2].filter(Boolean).join(', ') || "",
              city: mainAddress.city || "",
              province: mainAddress.province || mainAddress.state || "",
              zip: mainAddress.postalCode || "",
              country: mainAddress.country || "",
              marketingConsent: false,
              taxExempt: false,
              tags: c.isAdmin ? ["Admin"] : [],
              notes: "",
            }

            setCustomer(formatted)
            setInitialCustomer(formatted)
            setCartItems(c.cart || [])
            setWishlistItems(c.wishlist || [])

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

  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    if (!customer) return
    setIsSaving(true)
    try {
      const nameParts = customer.name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // 1. Update customer profile with B2B fields
      await apiRequest(`/admin/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          firstName,
          lastName,
          email: customer.email,
          phone: customer.phone,
          companyName: customer.companyName,
          companyTaxId: customer.companyTaxId,
          crNumber: customer.crNumber,
          customerGroup: customer.customerGroup,
          creditLimit: customer.creditLimit,
          availableCredit: customer.availableCredit,
          paymentTerms: customer.paymentTerms,
          accountDiscountPercent: customer.accountDiscountPercent,
        }),
      })

      // 2. Save/update default address
      if (customer.address || customer.city) {
        await apiRequest(`/admin/customers/${id}/addresses`, {
          method: "POST",
          body: JSON.stringify({
            addressLine1: customer.address || "Street Address",
            city: customer.city || "Dubai",
            country: customer.country || "United Arab Emirates",
            postalCode: customer.zip || "",
            isDefault: true,
          }),
        })
      }

      setInitialCustomer(JSON.parse(JSON.stringify(customer)))
      toast.success("Customer profile saved successfully")
    } catch (err) {
      console.error("Failed to save customer:", err)
      toast.error("Failed to save customer profile")
    } finally {
      setIsSaving(false)
    }
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

  const isCorporate = Boolean(
    customer?.customerGroup === "corporate" ||
    customer?.customerGroup === "wholesale" ||
    (customer?.companyName && customer.companyName.trim().length > 0)
  )

  return (
    <div className="flex flex-col h-full font-ui min-h-0">
      {/* Top Navigation / Header */}
      <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <Link
            href={isCorporate ? "/dashboard/customers/corporate" : "/dashboard/customers"}
            className="text-muted-foreground hover:text-foreground duration-200 flex items-center justify-center size-8 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <Icon name="arrow_back" className="size-5 text-[20px]" />
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-heading text-foreground tracking-tight leading-none">{customer.name}</h2>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
              customer.customerGroup === "corporate" 
                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                : customer.customerGroup === "wholesale"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                : "bg-muted text-muted-foreground"
            }`}>
              {customer.customerGroup || "retail"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCorporate && (
            <Button 
              variant="outline"
              size="sm" 
              className="h-8 shadow-xs text-xs px-3 cursor-pointer font-medium gap-1.5 rounded-lg border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              onClick={() => setCustomer(prev => prev ? { ...prev, customerGroup: "corporate" } : null)}
            >
              <Icon name="business" className="size-3.5 text-muted-foreground" />
              Upgrade to Corporate
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-1.5 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column */}
        <div className="flex-1 w-full flex flex-col gap-6">
          
          {/* General Information Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">General Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4">
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
                <div className="flex flex-col gap-2 md:col-span-2">
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

          {/* B2B Wholesale & Corporate Terms Card - Shown for Corporate / Wholesale clients */}
          {(customer.customerGroup === "corporate" || customer.customerGroup === "wholesale" || (customer.companyName && customer.companyName.trim().length > 0)) ? (
            <Card>
              <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold font-heading text-foreground">B2B Corporate Account & Credit Terms</CardTitle>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                  customer.customerGroup === "corporate" 
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                }`}>
                  {customer.customerGroup?.replace("_", " ") || "wholesale"}
                </span>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-foreground">Company Name</label>
                    <input
                      type="text"
                      placeholder="Company or business name"
                      className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={customer.companyName || ""}
                      onChange={(e) => setCustomer(prev => prev ? { ...prev, companyName: e.target.value } : null)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-foreground">Customer Tier Group</label>
                    <select
                      className="w-full h-9 px-3 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={customer.customerGroup}
                      onChange={(e) => setCustomer(prev => prev ? { ...prev, customerGroup: e.target.value as any } : null)}
                    >
                      <option value="wholesale">Wholesale (Bulk Pricing)</option>
                      <option value="corporate">Corporate VIP (Negotiated)</option>
                      <option value="retail">Downgrade to Retail</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-foreground">CR Number</label>
                    <input
                      type="text"
                      placeholder="Commercial registration number"
                      className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={customer.crNumber || ""}
                      onChange={(e) => setCustomer(prev => prev ? { ...prev, crNumber: e.target.value } : null)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-foreground">VAT / Tax Number</label>
                    <input
                      type="text"
                      placeholder="15-digit tax ID"
                      className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={customer.companyTaxId || ""}
                      onChange={(e) => setCustomer(prev => prev ? { ...prev, companyTaxId: e.target.value } : null)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-foreground">Payment Terms</label>
                    <select
                      className="w-full h-9 px-3 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={customer.paymentTerms}
                      onChange={(e) => setCustomer(prev => prev ? { ...prev, paymentTerms: e.target.value as any } : null)}
                    >
                      <option value="prepaid">Prepaid (Card / Online)</option>
                      <option value="net_15">Net 15 Days</option>
                      <option value="net_30">Net 30 Days</option>
                      <option value="net_60">Net 60 Days</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-foreground">Account Discount (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="0"
                        className="w-full h-9 px-3 pr-8 py-2 text-sm bg-background border border-border/60 rounded-md font-mono  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={customer.accountDiscountPercent === 0 ? "" : customer.accountDiscountPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setCustomer(prev => prev ? { ...prev, accountDiscountPercent: val } : null)
                        }}
                      />
                      <span className="absolute right-3 top-2 text-sm font-semibold text-muted-foreground pointer-events-none">%</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-foreground">Total Credit Limit ({tenantCurrency})</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0"
                      className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md font-mono  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={customer.creditLimit === 0 ? "" : customer.creditLimit}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setCustomer(prev => prev ? { ...prev, creditLimit: val } : null)
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-foreground">Available Credit ({tenantCurrency})</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0"
                      className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md font-mono   focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={customer.availableCredit === 0 ? "" : customer.availableCredit}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setCustomer(prev => prev ? { ...prev, availableCredit: val } : null)
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Default Address Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Default Address</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-foreground">Street Address</label>
                <input
                  type="text"
                  className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={customer.address}
                  onChange={(e) => setCustomer(prev => prev ? { ...prev, address: e.target.value } : null)}
                  placeholder="Street address, building, apartment/suite"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">City</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={customer.city}
                    onChange={(e) => setCustomer(prev => prev ? { ...prev, city: e.target.value } : null)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">Province / State</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={customer.province}
                    onChange={(e) => setCustomer(prev => prev ? { ...prev, province: e.target.value } : null)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">Pincode / Postal Code</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                    value={customer.zip}
                    onChange={(e) => setCustomer(prev => prev ? { ...prev, zip: e.target.value } : null)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">Country</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={customer.country}
                    onChange={(e) => setCustomer(prev => prev ? { ...prev, country: e.target.value } : null)}
                  />
                </div>
              </div>
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

          {/* Active Cart Items Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Current Cart Items</CardTitle>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {cartItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Customer's cart is currently empty.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="size-10 rounded-md object-cover border border-border/60" />
                        ) : (
                          <div className="size-10 rounded-md bg-muted/40 flex items-center justify-center">
                            <Icon name="inventory_2" className="size-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-foreground line-clamp-1">{item.name || 'Product'}</p>
                          <p className="text-xs text-muted-foreground">SKU: <span className="font-mono">{item.sku || '-'}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground text-xs font-medium font-mono">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Wishlist Items Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Saved Wishlist</CardTitle>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {wishlistItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No items in wishlist.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {wishlistItems.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt={item.title || item.name} className="size-10 rounded-md object-cover border border-border/60" />
                        ) : (
                          <div className="size-10 rounded-md bg-muted/40 flex items-center justify-center">
                            <Icon name="inventory_2" className="size-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-foreground line-clamp-1">{item.title || item.name || 'Product'}</p>
                          <p className="text-xs text-muted-foreground">SKU: <span className="font-mono">{item.sku || '-'}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          (item.stockQuantity ?? 1) > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                        }`}>
                          {(item.stockQuantity ?? 1) > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-6">
          
          {/* Notes Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-2">
              <textarea
                className="min-h-28 w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60 resize-y"
                placeholder="Add notes about this customer..."
                value={customer.notes}
                onChange={(e) => setCustomer(prev => prev ? { ...prev, notes: e.target.value } : null)}
              />
              <span className="text-xs text-muted-foreground">Notes are only visible to store staff.</span>
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

        </div>
      </div>

      {/* Sticky Bottom Save/Discard Bar matching product-details */}
      <div 
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 px-5 py-3 rounded-xl shadow-xl border border-border/80 backdrop-blur-md flex items-center gap-6 transition-all duration-300 ${
          hasChanges 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-8 pointer-events-none"
        }`}
      >
        <div className="flex flex-col gap-0.5 select-none">
          <span className="text-xs font-semibold text-foreground">Unsaved changes</span>
          <span className="text-[11px] text-muted-foreground">You have unsaved changes on this customer account.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs cursor-pointer px-3"
            onClick={handleDiscard}
            disabled={isSaving}
          >
            Discard
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer px-4 inline-flex items-center gap-1.5 font-medium"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}
