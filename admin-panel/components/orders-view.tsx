"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { apiRequest } from "@/lib/api-client"
import { OrdersStats, type OrderSummaryStatsProps } from "@/components/orders-stats"
import { toast } from "sonner"
import { formatPrice } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { ResponsiveDataView, type ColumnDef, type SortOption } from "@/components/shared/responsive-data-view"
import { useInfiniteData } from "@/hooks/use-infinite-data"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { ShoppingBag } from "lucide-react"

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

const SORT_OPTIONS: SortOption[] = [
  { label: "Date (Newest first)", value: "date-desc" },
  { label: "Date (Oldest first)", value: "date-asc" },
  { label: "Order # (High to Low)", value: "id-desc" },
  { label: "Order # (Low to High)", value: "id-asc" },
  { label: "Total (High to Low)", value: "total-desc" },
  { label: "Total (Low to High)", value: "total-asc" },
]

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const timeString = timeFormatter
    .format(date)
    .toLowerCase()
    .replace("am", "a.m")
    .replace("pm", "p.m")

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isToday) return `Today at ${timeString}`
  if (isYesterday) return `Yesterday at ${timeString}`

  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ` at ${timeString}`
  )
}

const formatOrderId = (id: string) => {
  if (!id) return ""
  const clean = id.replace(/^#/, "")
  if (clean.includes("-") && clean.length > 15) {
    const parts = clean.split("-")
    return `#${parts[0]}-${parts[parts.length - 1]}`
  }
  return `#${clean}`
}

function StatusBadge({ status }: { status: string }) {
  const clean = (status || "").toLowerCase().trim()
  let bgColor = "bg-muted text-muted-foreground"
  let label = status || "Pending"

  if (
    clean === "pending" ||
    clean === "pending_payment" ||
    clean === "payment pending"
  ) {
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
  } else if (
    clean === "delivered" ||
    clean === "fulfilled" ||
    clean === "paid"
  ) {
    bgColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
    label = "Delivered"
  } else if (clean === "cancelled" || clean === "refunded") {
    bgColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
    label = "Cancelled"
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-medium text-[11px] ${bgColor}`}
    >
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
  let fulfillmentStatus: "Fulfilled" | "Unfulfilled" | "Partially Fulfilled" =
    "Unfulfilled"

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
  const [activeTab, setActiveTab] = React.useState("All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)

  // Search & Filter States
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState(searchQuery)
  const [activeSort, setActiveSort] = React.useState("date-desc")
  const [paymentFilter, setPaymentFilter] = React.useState<string>("All")
  const [fulfillmentFilter, setFulfillmentFilter] = React.useState<string>("All")
  const [timeFilter, setTimeFilter] = React.useState<"today" | "7days" | "30days" | "all">("all")

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const fetchOrders = React.useCallback(async (page: number, limit: number) => {
    setMounted(true)

    const params = new URLSearchParams()
    params.set("page", page.toString())
    params.set("perPage", limit.toString())

    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim())
    }

    if (activeTab === "B2B Quotations") {
      params.set("search", "ORD-Q-")
    } else if (activeTab === "Pending & Processing") {
      params.set("status", "PENDING,CONFIRMED,PROCESSING,PENDING_PAYMENT")
    } else if (activeTab === "Delivered") {
      params.set("status", "DELIVERED,SHIPPED")
    }

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

    const [field, order] = activeSort.split("-")
    let mappedSortField = "date"
    if (field === "total") mappedSortField = "total"
    else if (field === "id") mappedSortField = "id"

    params.set("sortBy", mappedSortField)
    params.set("sortOrder", order || "desc")

    const res = await apiRequest(`/admin/orders/list-summary?${params.toString()}`)
    if (!res.ok) {
      throw new Error("Failed to fetch orders from backend")
    }

    const json = await res.json()
    const backendItems = json.data?.items || []
    const total = json.data?.total || 0
    const stats = json.data?.stats
    const currency = json.data?.currency || backendItems[0]?.currency || "SAR"
    const mapped = backendItems.map(mapBackendOrderToFrontend)

    return {
      items: mapped,
      total,
      meta: { stats, currency },
    }
  }, [debouncedSearch, activeTab, paymentFilter, fulfillmentFilter, activeSort])

  const {
    items: orders,
    totalItems: totalOrders,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMore,
    mutate: setOrders,
    meta,
  } = useInfiniteData<Order, { stats?: OrderSummaryStatsProps; currency?: string }>({
    fetcher: fetchOrders,
    pageSize: 20,
    deps: [debouncedSearch, activeTab, paymentFilter, fulfillmentFilter, activeSort],
  })

  const summaryStats = meta?.stats || null
  const tenantCurrency = meta?.currency || "SAR"

  // Bulk actions
  const handleBulkMarkAsPaid = () => {
    setOrders((prev) =>
      prev.map((o) =>
        selectedRows.has(o.id)
          ? { ...o, paymentStatus: "Paid" as const }
          : o
      )
    )
    toast.success(`Marked ${selectedRows.size} orders as Paid`)
    setSelectedRows(new Set())
  }

  // Desktop Table Column Definitions
  const columns: ColumnDef<Order>[] = [
    {
      header: "Order",
      accessor: (order) => {
        const displayOrderId = formatOrderId(order.orderNumber || order.id)
        const fullOrderNumber = order.orderNumber || order.id
        return (
          <div className="flex items-center gap-1.5" title={fullOrderNumber}>
            <span className="font-mono font-semibold text-[13px] text-foreground">
              {displayOrderId}
            </span>
            {order.orderNumber?.startsWith("ORD-Q-") && (
              <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 px-1.5 py-0.2 rounded border border-purple-200/50">
                B2B Quote
              </span>
            )}
          </div>
        )
      },
    },
    {
      header: "Date",
      accessor: (order) => (
        <span className="text-muted-foreground whitespace-nowrap text-xs">
          {mounted ? formatRelativeDate(order.date) : "—"}
        </span>
      ),
    },
    {
      header: "Customer",
      accessor: (order) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{order.customer.name}</span>
          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
            {order.customer.city || order.customer.email}
          </span>
        </div>
      ),
    },
    {
      header: "Total",
      accessor: (order) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground font-mono">
            {formatPrice(order.total, { currency: order.currency || "SAR" })}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (order) => (
        <StatusBadge
          status={order.status || order.fulfillmentStatus || order.paymentStatus}
        />
      ),
    },
  ]

  // Filter Dropdown Component for Desktop
  const filterDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-sm relative",
            (paymentFilter !== "All" || fulfillmentFilter !== "All") &&
              "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
          )}
        >
          <Icon name="filter_list" size={16} className="size-4!" />
          {(paymentFilter !== "All" || fulfillmentFilter !== "All") && (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-emerald-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Payment Status</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={paymentFilter}
          onValueChange={(val) => {
            setPaymentFilter(val)
          }}
        >
          {["All", "Paid", "Pending", "Refunded"].map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {s}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Fulfillment Status</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={fulfillmentFilter}
          onValueChange={(val) => {
            setFulfillmentFilter(val)
          }}
        >
          {["All", "Fulfilled", "Unfulfilled", "Partially Fulfilled"].map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {s}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {(paymentFilter !== "All" || fulfillmentFilter !== "All") && (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => {
                setPaymentFilter("All")
                setFulfillmentFilter("All")
              }}
              className="w-full text-xs text-center py-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer font-medium"
            >
              Clear All Filters
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Active Filter Badges
  const activeFilterBadges = (paymentFilter !== "All" || fulfillmentFilter !== "All" || searchQuery.trim()) && (
    <div className="flex items-center flex-wrap gap-1.5 px-3.5 py-2 bg-primary/5 border-b border-border/60 text-xs">
      <span className="text-muted-foreground font-medium mr-1 text-[11px]">Active Filters:</span>
      {paymentFilter !== "All" && (
        <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full text-primary text-[11px] font-medium">
          Payment: <strong>{paymentFilter}</strong>
          <button
            type="button"
            onClick={() => { setPaymentFilter("All"); }}
            className="hover:text-destructive cursor-pointer ml-0.5"
          >
            <Icon name="close" size={12} className="size-3" />
          </button>
        </span>
      )}
      {fulfillmentFilter !== "All" && (
        <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full text-primary text-[11px] font-medium">
          Fulfillment: <strong>{fulfillmentFilter}</strong>
          <button
            type="button"
            onClick={() => { setFulfillmentFilter("All"); }}
            className="hover:text-destructive cursor-pointer ml-0.5"
          >
            <Icon name="close" size={12} className="size-3" />
          </button>
        </span>
      )}
      {searchQuery.trim() && (
        <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full text-primary text-[11px] font-medium">
          Search: &quot;{searchQuery}&quot;
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="hover:text-destructive cursor-pointer ml-0.5"
          >
            <Icon name="close" size={12} className="size-3" />
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          setPaymentFilter("All")
          setFulfillmentFilter("All")
          setSearchQuery("")
        }}
        className="text-[11px] text-primary hover:underline ml-1 cursor-pointer font-medium"
      >
        Clear all
      </button>
    </div>
  )

  return (
    <ResponsiveDataView<Order>
      title="Orders"
      hideDesktopTitle={true}
      topContent={
        <OrdersStats
          orders={orders}
          totalOrdersCount={totalOrders}
          stats={summaryStats || undefined}
          currency={tenantCurrency}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
        />
      }
      tabs={TABS}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
        }}
        searchPlaceholder="Search orders, customers..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterDropdown={filterDropdown}
        activeFilterBadges={activeFilterBadges}
        sortOptions={SORT_OPTIONS}
        activeSort={activeSort}
        onSortChange={(sort) => {
          setActiveSort(sort)
        }}
        items={orders}
        getItemId={(order) => order.id}
        isLoading={isLoading}
        emptyMessage="No orders found"
        selectedIds={selectedRows}
        onSelectionChange={setSelectedRows}
        totalItems={totalOrders}
        bulkActions={
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs cursor-pointer"
              onClick={handleBulkMarkAsPaid}
            >
              Mark as Paid
            </Button>
          </div>
        }
        columns={columns}
        renderMobileCard={(order) => {
          const displayOrderId = formatOrderId(order.orderNumber || order.id)
          const formattedDate = mounted ? formatRelativeDate(order.date) : ""

          return (
            <div className="py-3 px-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 active:bg-muted/50 transition-colors">
              {/* Order Info */}
              <div className="flex-1 min-w-0">
                {/* Top line: Order ID + Status Pill */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-[13.5px] text-foreground tracking-tight">
                    {displayOrderId}
                  </span>
                  <StatusBadge status={order.status || order.fulfillmentStatus || order.paymentStatus} />
                  {order.orderNumber?.startsWith("ORD-Q-") && (
                    <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 px-1.5 py-0.5 rounded">
                      B2B Quote
                    </span>
                  )}
                </div>

                {/* Subtitle: Customer Name • Items count • Date */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                  <span className="font-medium text-foreground/90 truncate max-w-[140px]">
                    {order.customer.name}
                  </span>
                  <span>•</span>
                  <span className="shrink-0">{order.itemCount} {order.itemCount === 1 ? "item" : "items"}</span>
                  {formattedDate && (
                    <>
                      <span>•</span>
                      <span className="truncate">{formattedDate}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Total Price & Navigation Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-[14px] tracking-tight text-foreground font-mono">
                  {formatPrice(order.total, { currency: order.currency || "SAR" })}
                </span>
                <Icon
                  name="chevron_right"
                  size={16}
                  className="text-muted-foreground/30 size-4"
                />
              </div>
            </div>
          )
        }}
        onRowClick={(order) => router.push(`/dashboard/orders/${order.id}`)}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        itemCountLabel="orders"
      />
  )
}
