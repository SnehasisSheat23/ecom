import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { formatPrice } from "@/lib/currency"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
  paymentStatus: "Paid" | "Pending" | "Refunded"
  fulfillmentStatus: "Fulfilled" | "Unfulfilled" | "Partially Fulfilled"
  total: number
  currency?: string
  additionalDetails?: string
}

export interface OrderSummaryStatsProps {
  totalOrders?: number
  totalRevenue?: number
  fulfilledOrders?: number
  cancelledOrders?: number
  pendingOrders?: number
  totalItems?: number
}

// Simple visual sparkline bar chart
function Sparkline({ data }: { data: number[] }) {
  const displayData = data.slice(-15)
  const max = Math.max(...displayData, 1)
  return (
    <div className="flex items-end gap-[2px] h-8 ml-auto shrink-0">
      {displayData.map((val, idx) => (
        <div
          key={idx}
          className="w-[4px] bg-[#40b1ea] rounded-t-[2px]"
          style={{ height: `${(val / max) * 100}%`, opacity: idx < displayData.length - 6 ? 0.3 : 1 }}
        />
      ))}
    </div>
  )
}

interface OrdersStatsProps {
  orders: Order[]
  totalOrdersCount?: number
  stats?: OrderSummaryStatsProps
  currency?: string
  timeFilter: "today" | "7days" | "30days" | "all"
  setTimeFilter: (filter: "today" | "7days" | "30days" | "all") => void
}

export function OrdersStats({ orders, totalOrdersCount, stats, currency, timeFilter, setTimeFilter }: OrdersStatsProps) {
  const activeCurrency = currency || orders[0]?.currency || "INR"

  const displayTotalOrders = stats?.totalOrders ?? totalOrdersCount ?? orders.length
  const displayTotalRevenue = stats?.totalRevenue ?? orders.reduce((sum, o) => sum + o.total, 0)
  const displayFulfilled = stats?.fulfilledOrders ?? orders.filter(o => o.fulfillmentStatus === "Fulfilled").length
  const displayCancelled = stats?.cancelledOrders ?? orders.filter(o => o.paymentStatus === "Refunded").length
  const displayPending = stats?.pendingOrders ?? orders.filter(o => o.fulfillmentStatus === "Unfulfilled").length

  const getOrderHistory = () => {
    const dailyCounts: Record<string, number> = {}
    orders.forEach(o => {
      const day = new Date(o.date).toLocaleDateString()
      dailyCounts[day] = (dailyCounts[day] || 0) + 1
    })
    const counts = Object.keys(dailyCounts)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(k => dailyCounts[k])
    
    return counts.length >= 5 ? counts : [2, 3, 5, 4, 6, 8, 5, 7, 9, 8, 12, 10, 14, 13, 15]
  }

  const getFulfillmentHistory = () => {
    const dailyCounts: Record<string, number> = {}
    orders.filter(o => o.fulfillmentStatus === "Fulfilled").forEach(o => {
      const day = new Date(o.date).toLocaleDateString()
      dailyCounts[day] = (dailyCounts[day] || 0) + 1
    })
    const counts = Object.keys(dailyCounts)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(k => dailyCounts[k])
    
    return counts.length >= 5 ? counts : [1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 8, 7, 9, 8, 10]
  }

  const filterLabelMap = {
    today: "Today",
    "7days": "7 days",
    "30days": "30 days",
    all: "All time",
  }

  return (
    <div className="w-full overflow-x-auto pb-1 -mb-1">
      <div className="min-w-[990px] xl:min-w-0 w-full bg-card border border-border/80 rounded-xl shadow-xs flex divide-x divide-border/60 overflow-hidden font-ui">
        {/* Time selector block */}
        <div className="flex items-center justify-center px-4 py-4 w-[130px] shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:bg-muted/50 px-2 py-1.5 rounded-md transition-colors cursor-pointer outline-none focus:outline-none">
                {filterLabelMap[timeFilter]}
                <Icon name="expand_more" className="size-4! text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup value={timeFilter} onValueChange={(val) => setTimeFilter(val as typeof timeFilter)}>
                <DropdownMenuRadioItem value="today">Today</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="7days">7 days</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="30days">30 days</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="all">All time</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Total Orders */}
        <div className="flex-1 min-w-[200px] flex flex-col px-4 py-3">
          <span className="text-[13px] font-medium text-muted-foreground mb-1 whitespace-nowrap">Total Orders</span>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-end gap-2 shrink-0">
              <span className="text-2xl font-bold font-heading tabular-nums leading-none text-foreground">
                {displayTotalOrders.toLocaleString()}
              </span>
            </div>
            <Sparkline data={getOrderHistory()} />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="flex-1 min-w-[200px] flex flex-col px-4 py-3">
          <span className="text-[13px] font-medium text-muted-foreground mb-1 whitespace-nowrap">Total Revenue</span>
          <div className="flex items-end h-8 gap-1.5">
            <span className="text-2xl font-bold font-heading tabular-nums leading-none text-foreground">
              {formatPrice(displayTotalRevenue, { currency: activeCurrency, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Fulfilled / Delivered Orders */}
        <div className="flex-1 min-w-[200px] flex flex-col px-4 py-3">
          <span className="text-[13px] font-medium text-muted-foreground mb-1 whitespace-nowrap">Delivered Orders</span>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-end gap-2 shrink-0">
              <span className="text-2xl font-bold font-heading tabular-nums leading-none text-foreground">
                {displayFulfilled.toLocaleString()}
              </span>
            </div>
            <Sparkline data={getFulfillmentHistory()} />
          </div>
        </div>

        {/* Pending Orders */}
        <div className="w-[130px] shrink-0 flex flex-col px-4 py-3">
          <span className="text-[13px] font-medium text-muted-foreground mb-1 whitespace-nowrap">Pending</span>
          <div className="flex items-end h-8 gap-1.5">
            <span className="text-2xl font-bold font-heading tabular-nums leading-none text-foreground">
              {displayPending.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cancelled Orders */}
        <div className="w-[130px] shrink-0 flex flex-col px-4 py-3">
          <span className="text-[13px] font-medium text-muted-foreground mb-1 whitespace-nowrap">Cancelled</span>
          <div className="flex items-end h-8 gap-1.5">
            <span className="text-2xl font-bold font-heading tabular-nums leading-none text-foreground">
              {displayCancelled.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
