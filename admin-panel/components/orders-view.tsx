"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import ordersData from "@/app/dashboard/orders.json"
import { apiRequest } from "@/lib/api-client"
import { OrdersStats, type OrderSummaryStatsProps } from "@/components/orders-stats"
import { toast } from "sonner"
import { formatPrice } from "@/lib/currency"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

interface Customer {
  name: string
  email: string
  city: string
}

interface Order {
  id: string
  date: string
  customer: Customer
  itemCount: number
  status: string
  paymentStatus: "Paid" | "Pending" | "Refunded"
  fulfillmentStatus: "Fulfilled" | "Unfulfilled" | "Partially Fulfilled"
  total: number
  additionalDetails?: string
  syncMessage?: string
  currency?: string
  orderNumber?: string
}

const TABS = ["All", "Pending & Processing", "Delivered", "B2B Quotations"]

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  
  const timeString = timeFormatter.format(date).toLowerCase().replace('am', 'a.m').replace('pm', 'p.m')
  
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()
  
  if (isToday) return `Today at ${timeString}`
  if (isYesterday) return `Yesterday at ${timeString}`
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` at ${timeString}`
}

const formatOrderId = (id: string) => {
  if (!id) return ''
  const clean = id.replace(/^#/, '')
  // If it's a long timestamp like ORD-1790471675829-4143, shorten display to #ORD-4143
  if (clean.includes('-') && clean.length > 15) {
    const parts = clean.split('-')
    return `#${parts[0]}-${parts[parts.length - 1]}`
  }
  return `#${clean}`
}

function StatusBadge({ status }: { status: string }) {
  const clean = (status || "").toLowerCase().trim()
  let bgColor = "bg-muted text-muted-foreground"
  let label = status || "Pending"

  if (clean === "pending" || clean === "pending_payment" || clean === "payment pending") {
    bgColor = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
    label = "Pending"
  } else if (clean === "processing") {
    bgColor = "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
    label = "Processing"
  } else if (clean === "confirmed") {
    bgColor = "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
    label = "Confirmed"
  } else if (clean === "shipped" || clean === "out_for_delivery") {
    bgColor = "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
    label = "Shipped"
  } else if (clean === "delivered" || clean === "fulfilled" || clean === "paid") {
    bgColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
    label = "Delivered"
  } else if (clean === "cancelled" || clean === "refunded") {
    bgColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
    label = "Cancelled"
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-medium text-[11px] ${bgColor}`}>
      {label}
    </span>
  )
}

interface BackendOrderSummary {
  id: string
  orderNumber: string
  status: string
  guestEmail?: string | null
  total: number
  createdAt: string
  customerName: string
  customerEmail: string
  customerCity: string
  itemCount: number
  syncMessage?: string
  currency?: string
}

const mapBackendOrderToFrontend = (item: BackendOrderSummary): Order => {
  let paymentStatus: "Paid" | "Pending" | "Refunded" = "Pending"
  let fulfillmentStatus: "Fulfilled" | "Unfulfilled" | "Partially Fulfilled" = "Unfulfilled"

  const rawStatus = (item.status || "PENDING").toUpperCase()
  if (rawStatus === "DELIVERED" || rawStatus === "SHIPPED") {
    paymentStatus = "Paid"
    fulfillmentStatus = "Fulfilled"
  } else if (rawStatus === "CONFIRMED" || rawStatus === "PROCESSING") {
    paymentStatus = "Paid"
    fulfillmentStatus = "Unfulfilled"
  } else if (rawStatus === "CANCELLED") {
    paymentStatus = "Refunded"
    fulfillmentStatus = "Unfulfilled"
  }

  return {
    id: item.id,
    date: item.createdAt || new Date().toISOString(),
    customer: {
      name: item.customerName || "Customer",
      email: item.customerEmail || "guest@example.com",
      city: item.customerCity || "Riyadh",
    },
    itemCount: item.itemCount || 1,
    status: rawStatus,
    paymentStatus,
    fulfillmentStatus,
    total: parseFloat(String(item.total || (item as any).totalAmount || 0)),
    syncMessage: item.syncMessage,
    orderNumber: item.orderNumber,
    currency: item.currency || (item as any).currency || "SAR",
  }
}

export function OrdersView() {
  const [orders, setOrders] = React.useState<Order[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)

  // Search, Filter, Sort States
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)
  const [sortField, setSortField] = React.useState<keyof Order | "customer">("date")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  const [paymentFilter, setPaymentFilter] = React.useState<"All" | "Paid" | "Pending" | "Refunded">("All")
  const [fulfillmentFilter, setFulfillmentFilter] = React.useState<"All" | "Fulfilled" | "Unfulfilled" | "Partially Fulfilled">("All")
  const [timeFilter, setTimeFilter] = React.useState<"today" | "7days" | "30days" | "all">("all")

  // Pagination States
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)
  const [totalOrders, setTotalOrders] = React.useState(0)
  const [summaryStats, setSummaryStats] = React.useState<OrderSummaryStatsProps | null>(null)
  const [tenantCurrency, setTenantCurrency] = React.useState<string>("SAR")
  const [debouncedSearch, setDebouncedSearch] = React.useState(searchQuery)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
      setIsLoading(true)
    }, 0)

    // Build query params
    const params = new URLSearchParams()
    params.set("page", currentPage.toString())
    params.set("perPage", pageSize.toString())

    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim())
    }

    // Map active tab to status filter
    if (activeTab === "B2B Quotations") {
      params.set("search", "ORD-Q-")
    } else if (activeTab === "Pending & Processing") {
      params.set("status", "PENDING,CONFIRMED,PROCESSING,PENDING_PAYMENT")
    } else if (activeTab === "Delivered") {
      params.set("status", "DELIVERED,SHIPPED")
    }

    // Dropdown filters mapping
    if (paymentFilter !== "All") {
      if (paymentFilter === "Paid") {
        params.set("status", "CONFIRMED,PROCESSING,SHIPPED,DELIVERED")
      } else if (paymentFilter === "Pending") {
        params.set("status", "PENDING,PENDING_PAYMENT")
      } else if (paymentFilter === "Refunded") {
        params.set("status", "CANCELLED")
      }
    }

    if (fulfillmentFilter !== "All") {
      if (fulfillmentFilter === "Fulfilled") {
        params.set("status", "DELIVERED,SHIPPED")
      } else if (fulfillmentFilter === "Unfulfilled") {
        params.set("status", "PENDING,CONFIRMED,PROCESSING")
      }
    }

    // Time filter mapping
    if (timeFilter !== "all") {
      params.set("timeFilter", timeFilter)
    }

    // Map sort fields
    let mappedSortField: "date" | "total" | "id" = "date"
    if (sortField === "total") {
      mappedSortField = "total"
    } else if (sortField === "id") {
      mappedSortField = "id"
    }
    params.set("sortBy", mappedSortField)
    params.set("sortOrder", sortOrder)

    apiRequest(`/admin/orders/list-summary?${params.toString()}`)
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw new Error("Failed to fetch orders from backend")
      })
      .then((json) => {
        const backendItems = json.data?.items || []
        const total = json.data?.total || 0
        const stats = json.data?.stats
        const currency = json.data?.currency || backendItems[0]?.currency || "SAR"
        const mapped = backendItems.map(mapBackendOrderToFrontend)
        setOrders(mapped)
        setTotalOrders(total)
        setTenantCurrency(currency)
        if (stats) setSummaryStats(stats)
      })
      .catch((err) => {
        console.error("Failed to load orders from backend:", err)
        toast.error("Failed to load orders from backend.")
        setOrders([])
        setTotalOrders(0)
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => clearTimeout(timer)
  }, [currentPage, pageSize, debouncedSearch, activeTab, paymentFilter, fulfillmentFilter, sortField, sortOrder, timeFilter])

  // Reset page when filter states change is now handled in event handlers directly to prevent cascading renders.

  const filteredOrders = orders
  const timeFilteredOrders = orders

  // Bulk Actions
  const handleBulkMarkAsPaid = () => {
    setOrders(prev =>
      prev.map(o => (selectedRows.has(o.id) ? { ...o, paymentStatus: "Paid" as const } : o))
    )
    toast.success(`Marked ${selectedRows.size} orders as Paid`)
    setSelectedRows(new Set())
  }

  const handleBulkMarkAsFulfilled = () => {
    setOrders(prev =>
      prev.map(o => (selectedRows.has(o.id) ? { ...o, fulfillmentStatus: "Fulfilled" as const } : o))
    )
    toast.success(`Marked ${selectedRows.size} orders as Fulfilled`)
    setSelectedRows(new Set())
  }

  const handleBulkDelete = () => {
    setOrders(prev => prev.filter(o => !selectedRows.has(o.id)))
    toast.success(`Deleted ${selectedRows.size} orders`)
    setSelectedRows(new Set())
  }



  // Row Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredOrders.map(o => o.id)
      setSelectedRows(new Set(allFilteredIds))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (orderId: string, checked: boolean) => {
    const newSelection = new Set(selectedRows)
    if (checked) {
      newSelection.add(orderId)
    } else {
      newSelection.delete(orderId)
    }
    setSelectedRows(newSelection)
  }

  const toggleSort = (field: keyof Order | "customer") => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: keyof Order | "customer") => {
    if (sortField !== field) {
      return <Icon name="swap_vert" size={14} className="size-3.5! text-muted-foreground opacity-30 hover:opacity-100 transition-opacity ml-0.5" />
    }
    return sortOrder === "asc"
      ? <Icon name="arrow_upward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5" />
      : <Icon name="arrow_downward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5" />
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui">
      
      {/* Top Stats */}
      <OrdersStats 
        orders={timeFilteredOrders} 
        totalOrdersCount={totalOrders}
        stats={summaryStats || undefined}
        currency={tenantCurrency}
        timeFilter={timeFilter} 
        setTimeFilter={(filter) => {
          setTimeFilter(filter)
          setCurrentPage(1)
        }} 
      />

      {/* Orders Table Container */}
      <div className="border border-border/80 rounded-lg overflow-hidden bg-card/40 shadow-xs flex flex-col flex-1 min-h-0 mt-2">
        
        {/* Toolbar & Filters */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-2 h-12 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-fade-right pr-4 flex-1 min-w-0">
            <Button
              variant={activeTab === "All" ? "secondary" : "ghost"}
              className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-1 transition-colors cursor-pointer ${
                activeTab === "All" ? "bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
              onClick={() => {
                setActiveTab("All")
                setCurrentPage(1)
              }}
            >
              All
            </Button>
            
            {TABS.slice(1).map(tab => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                className={`h-8 rounded-md text-xs font-medium px-3 transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab ? "bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                onClick={() => {
                  setActiveTab(tab)
                  setCurrentPage(1)
                }}
              >
                {tab}
              </Button>
            ))}


            {/* Clear All Filters Tag */}
            {(paymentFilter !== "All" || fulfillmentFilter !== "All" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-transparent cursor-pointer shrink-0 font-medium ml-1 gap-1"
                onClick={() => {
                  setPaymentFilter("All")
                  setFulfillmentFilter("All")
                  setSearchQuery("")
                  setCurrentPage(1)
                }}
              >
                <Icon name="close" size={14} className="size-3.5!" /> Clear filters
              </Button>
            )}
          </div>

          {selectedRows.size > 0 ? (
            <div className="flex items-center gap-1 pl-2 border-l border-border/60 ml-auto animate-in fade-in slide-in-from-right-2 duration-150 shrink-0">
              <span className="text-[11px] text-muted-foreground font-medium mr-1.5 whitespace-nowrap">
                {selectedRows.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                onClick={handleBulkMarkAsPaid}
              >
                <Icon name="payments" size={14} className="size-3.5!" /> Mark Paid
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 cursor-pointer hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
                onClick={handleBulkMarkAsFulfilled}
              >
                <Icon name="local_shipping" size={14} className="size-3.5!" /> Mark Fulfilled
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive text-destructive"
                onClick={handleBulkDelete}
              >
                <Icon name="delete" size={14} className="size-3.5!" /> Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                onClick={() => setSelectedRows(new Set())}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 pl-2 border-l border-border/60 ml-auto shrink-0">
              {isSearchVisible ? (
                <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2 w-48 md:w-60 animate-in fade-in zoom-in-95 duration-200">
                  <Icon name="search" size={14} className="size-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none focus:outline-none text-xs text-foreground placeholder:text-muted-foreground w-full h-full pl-1 ml-0.5 shrink min-w-0"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center">
                      <Icon name="close" size={12} className="size-3 text-muted-foreground" />
                    </button>
                  )}
                  <button 
                    onClick={() => { setIsSearchVisible(false); setSearchQuery(""); }} 
                    className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                  >
                    <Icon name="keyboard_double_arrow_right" size={14} className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 bg-background shadow-xs cursor-pointer"
                  onClick={() => setIsSearchVisible(true)}
                >
                  <Icon name="search" size={16} className="size-4! text-muted-foreground" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={paymentFilter !== "All" || fulfillmentFilter !== "All" ? "secondary" : "outline"} 
                    size="icon" 
                    className={`h-8 w-8 bg-background shadow-xs cursor-pointer ${(paymentFilter !== "All" || fulfillmentFilter !== "All") ? "bg-muted text-foreground border-border/80" : ""}`}
                  >
                    <Icon name="filter_list" size={16} className="size-4! text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Filter orders</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-2 flex flex-col gap-2.5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Payment Status</span>
                      <div className="flex flex-wrap gap-1">
                        {["All", "Paid", "Pending", "Refunded"].map(status => (
                          <Button
                            key={status}
                            variant={paymentFilter === status ? "secondary" : "outline"}
                            size="sm"
                            className="h-7 text-[11px] px-2.5 cursor-pointer"
                            onClick={() => {
                              setPaymentFilter(status as "All" | "Paid" | "Pending" | "Refunded")
                              setCurrentPage(1)
                            }}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Fulfillment Status</span>
                      <div className="flex flex-wrap gap-1">
                        {["All", "Fulfilled", "Unfulfilled", "Partially Fulfilled"].map(status => (
                          <Button
                            key={status}
                            variant={fulfillmentFilter === status ? "secondary" : "outline"}
                            size="sm"
                            className="h-7 text-[11px] px-2.5 cursor-pointer"
                            onClick={() => {
                              setFulfillmentFilter(status as "All" | "Fulfilled" | "Unfulfilled" | "Partially Fulfilled")
                              setCurrentPage(1)
                            }}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {(paymentFilter !== "All" || fulfillmentFilter !== "All") && (
                      <>
                        <DropdownMenuSeparator className="-mx-2" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 justify-center font-medium w-full cursor-pointer"
                          onClick={() => {
                            setPaymentFilter("All")
                            setFulfillmentFilter("All")
                            setCurrentPage(1)
                          }}
                        >
                          Clear all filters
                        </Button>
                      </>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 bg-background shadow-xs cursor-pointer">
                    <Icon name="swap_vert" size={16} className="size-4! text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={`${sortField}-${sortOrder}`} onValueChange={(val) => {
                    const [field, order] = val.split("-")
                    setSortField(field as keyof Order | "customer")
                    setSortOrder(order as "asc" | "desc")
                  }}>
                    <DropdownMenuRadioItem value="date-desc">Date (Newest first)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="date-asc">Date (Oldest first)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="id-desc">Order # (High to Low)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="id-asc">Order # (Low to High)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="total-desc">Total (High to Low)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="total-asc">Total (Low to High)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="customer-asc">Customer A-Z</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="customer-desc">Customer Z-A</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 bg-card backdrop-blur-xs font-ui text-xs font-medium text-muted-foreground border-b border-border/60 z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <Checkbox
                    checked={
                      filteredOrders.length > 0 &&
                      filteredOrders.every(o => selectedRows.has(o.id))
                    }
                    onCheckedChange={(val) => handleSelectAll(!!val)}
                    aria-label="Select all orders"
                  />
                </th>
                <th className="p-3 font-semibold text-foreground select-none">
                  <div onClick={() => toggleSort("id")} className="flex items-center cursor-pointer hover:text-foreground">
                    Order {renderSortIcon("id")}
                  </div>
                </th>
                <th className="p-3 font-semibold text-foreground select-none">
                  <div onClick={() => toggleSort("date")} className="flex items-center cursor-pointer hover:text-foreground">
                    Date {renderSortIcon("date")}
                  </div>
                </th>
                <th className="p-3 font-semibold text-foreground select-none">
                  <div onClick={() => toggleSort("customer")} className="flex items-center cursor-pointer hover:text-foreground">
                    Customer {renderSortIcon("customer")}
                  </div>
                </th>
                <th className="p-3 font-semibold text-foreground select-none">
                  <div onClick={() => toggleSort("total")} className="flex items-center cursor-pointer hover:text-foreground">
                    Total {renderSortIcon("total")}
                  </div>
                </th>
                <th className="p-3 font-semibold text-foreground select-none">
                  Status
                </th>
                <th className="p-3 w-10 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="h-[52px] animate-pulse">
                    <td className="p-3 text-center">
                      <div className="size-4 bg-muted/60 rounded mx-auto" />
                    </td>
                    <td className="p-3">
                      <div className="h-3 w-20 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-3 w-28 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-3 w-32 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-3 w-20 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-5 w-24 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3 text-right">
                      <div className="size-4 bg-muted/60 rounded-full ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground font-ui">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name="inbox" size={32} className="size-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No orders found</p>
                      <p className="text-xs text-muted-foreground">Try clearing filters or changing your search criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedRows.has(order.id)
                  const totalItems = order.itemCount
                  const displayOrderId = formatOrderId(order.orderNumber || order.id)
                  const fullOrderNumber = order.orderNumber || order.id

                  return (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                      className={`group hover:bg-muted/40 cursor-pointer duration-150 text-[13px] ${
                        isSelected ? "bg-muted/40" : "bg-card/20"
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(val) => handleSelectRow(order.id, !!val)}
                          aria-label={`Select order ${order.id}`}
                        />
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5" title={fullOrderNumber}>
                          <span className="font-mono text-[13px]">{displayOrderId}</span>
                          {order.orderNumber?.startsWith('ORD-Q-') && (
                            <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 px-1.5 py-0.2 rounded border border-purple-200/50">
                              B2B Quote
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                        {mounted ? formatRelativeDate(order.date) : "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{order.customer.name}</span>
                          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {order.customer.city || order.customer.email}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground font-mono">
                            {formatPrice(order.total, { currency: order.currency || "SAR" })}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {totalItems} {totalItems === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={order.status || order.fulfillmentStatus || order.paymentStatus} />
                      </td>
                      <td className="p-3 text-right">
                        <Icon name="chevron_right" size={16} className="size-4 text-muted-foreground/40 group-hover:text-foreground transition-colors ml-auto" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 h-12 shrink-0 text-xs font-ui">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>
              Showing {totalOrders > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
              {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders} orders
            </span>
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1 select-none cursor-pointer">
                    {pageSize} <Icon name="keyboard_arrow_down" size={14} className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-16">
                  {[10, 20, 50, 100].map((size) => (
                    <DropdownMenuItem key={size} onClick={() => { setPageSize(size); setCurrentPage(1); }} className="cursor-pointer">
                      {size}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground mr-2">
              Page {currentPage} of {Math.max(Math.ceil(totalOrders / pageSize), 1)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <Icon name="first_page" size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <Icon name="chevron_left" size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(Math.ceil(totalOrders / pageSize), 1)))}
              disabled={currentPage >= Math.ceil(totalOrders / pageSize)}
            >
              <Icon name="chevron_right" size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setCurrentPage(Math.max(Math.ceil(totalOrders / pageSize), 1))}
              disabled={currentPage >= Math.ceil(totalOrders / pageSize)}
            >
              <Icon name="last_page" size={16} />
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
