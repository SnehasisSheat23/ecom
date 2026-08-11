"use client"

import * as React from "react"
import { toast } from "sonner"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import ordersData from "@/app/dashboard/orders.json"
import { formatPrice } from "@/lib/currency"

interface Customer {
  name: string
  email: string
  city: string
}

interface LineItem {
  name: string
  sku: string
  qty: number
  price: number
}

interface Order {
  id: string
  date: string
  customer: Customer
  items: LineItem[]
  paymentStatus: "Paid" | "Pending" | "Refunded"
  fulfillmentStatus: "Fulfilled" | "Unfulfilled" | "Partially Fulfilled"
  total: number
  googleSync: "Synced" | "Pending" | "Error"
  syncMessage: string
  currency?: string
}

export function ShopifyOrders() {
  const [orders, setOrders] = React.useState<Order[]>(ordersData as Order[])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedFilter, setSelectedFilter] = React.useState<"All" | "Synced" | "Pending" | "Error" | "Unfulfilled">("All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null)
  const [isBulkSyncing, setIsBulkSyncing] = React.useState(false)
  const [isSingleSyncing, setIsSingleSyncing] = React.useState<string | null>(null)

  // Calculate Metrics
  const metrics = React.useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (o.paymentStatus === "Paid" ? o.total : 0), 0)
    const activeOrders = orders.length
    const syncedCount = orders.filter(o => o.googleSync === "Synced").length
    const syncRate = activeOrders > 0 ? Math.round((syncedCount / activeOrders) * 100) : 0
    const errorCount = orders.filter(o => o.googleSync === "Error").length

    return {
      totalSales,
      activeOrders,
      syncRate,
      errorCount,
    }
  }, [orders])

  // Filter & Search Handler
  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      // Filter by selection pill
      if (selectedFilter === "Synced" && order.googleSync !== "Synced") return false
      if (selectedFilter === "Pending" && order.googleSync !== "Pending") return false
      if (selectedFilter === "Error" && order.googleSync !== "Error") return false
      if (selectedFilter === "Unfulfilled" && order.fulfillmentStatus === "Fulfilled") return false

      // Filter by search bar query
      if (searchQuery.trim() === "") return true

      const query = searchQuery.toLowerCase()
      return (
        order.id.toLowerCase().includes(query) ||
        order.customer.name.toLowerCase().includes(query) ||
        order.customer.email.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query))
      )
    })
  }, [orders, selectedFilter, searchQuery])

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

  // Sync actions
  const handleSingleSync = (orderId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation()
    setIsSingleSyncing(orderId)
    toast.loading(`Syncing order ${orderId} to Google Merchant Center...`, {
      id: `sync-${orderId}`,
    })

    setTimeout(() => {
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? {
                ...o,
                googleSync: "Synced" as const,
                syncMessage: "Synced to Google Merchant Center successfully.",
              }
            : o
        )
      )
      setIsSingleSyncing(null)
      toast.success(`Order ${orderId} successfully synced with Google!`, {
        id: `sync-${orderId}`,
        duration: 3000,
      })
      
      // Update selectedOrder if it is currently displayed
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, googleSync: "Synced", syncMessage: "Synced to Google Merchant Center successfully." } : null)
      }
    }, 1200)
  }

  const handleBulkSync = () => {
    if (selectedRows.size === 0) return
    setIsBulkSyncing(true)
    const selectedList = Array.from(selectedRows)
    
    toast.loading(`Bulk syncing ${selectedList.length} orders with Google Merchant Center...`, {
      id: "bulk-sync",
    })

    setTimeout(() => {
      setOrders(prev =>
        prev.map(o =>
          selectedRows.has(o.id)
            ? {
                ...o,
                googleSync: "Synced" as const,
                syncMessage: "Synced to Google Merchant Center successfully.",
              }
            : o
        )
      )
      setIsBulkSyncing(false)
      setSelectedRows(new Set())
      toast.success(`Successfully synchronized ${selectedList.length} orders with Google!`, {
        id: "bulk-sync",
        duration: 3500,
      })
    }, 1800)
  }

  const handleBulkMarkSynced = () => {
    if (selectedRows.size === 0) return
    const selectedList = Array.from(selectedRows)
    setOrders(prev =>
      prev.map(o =>
        selectedRows.has(o.id)
          ? {
              ...o,
              googleSync: "Synced" as const,
              syncMessage: "Marked as Synced by administrator.",
            }
          : o
      )
    )
    setSelectedRows(new Set())
    toast.success(`Marked ${selectedList.length} orders as Synced in Google feed.`);
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* 1. Metric summary cards with Google HSL styles */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <Card className="bg-gradient-to-t from-emerald-500/5 to-card border border-border/80 shadow-xs dark:from-emerald-500/10">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-ui text-muted-foreground font-medium">Total Confirmed Sales</CardDescription>
            <CardTitle className="text-2xl font-bold font-heading tabular-nums mt-1 text-foreground">
              {formatPrice(metrics.totalSales, { currency: "USD" })}
            </CardTitle>
          </CardHeader>
          <CardFooter className="p-4 pt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Icon name="trending_up" className="size-3.5! text-[14px]!" />
              +15.8%
            </span>
            <span>From past 30 days</span>
          </CardFooter>
        </Card>

        {/* Total Orders */}
        <Card className="bg-gradient-to-t from-blue-500/5 to-card border border-border/80 shadow-xs dark:from-blue-500/10">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-ui text-muted-foreground font-medium">Total Synced Orders</CardDescription>
            <CardTitle className="text-2xl font-bold font-heading mt-1 text-foreground">
              {metrics.activeOrders}
            </CardTitle>
          </CardHeader>
          <CardFooter className="p-4 pt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
              <Icon name="check_circle" className="size-3.5! text-[14px]!" />
              100% active
            </span>
            <span>All channels active</span>
          </CardFooter>
        </Card>

        {/* Sync Rate */}
        <Card className="bg-gradient-to-t from-violet-500/5 to-card border border-border/80 shadow-xs dark:from-violet-500/10">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-ui text-muted-foreground font-medium">Google Sync Rate</CardDescription>
            <CardTitle className="text-2xl font-bold font-heading mt-1 text-foreground">
              {metrics.syncRate}%
            </CardTitle>
          </CardHeader>
          <CardFooter className="p-4 pt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-violet-600 dark:text-violet-400">
              <Icon name="sync_saved_locally" className="size-3.5! text-[14px]!" />
              Google Feed Active
            </span>
            <span>Target: 95%</span>
          </CardFooter>
        </Card>

        {/* Sync Errors */}
        <Card className={`bg-gradient-to-t border shadow-xs transition-all ${
          metrics.errorCount > 0 
            ? "from-rose-500/5 to-card border-rose-200 dark:from-rose-500/10 dark:border-rose-900/30" 
            : "from-gray-500/5 to-card border-border"
        }`}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-ui text-muted-foreground font-medium">Feed Sync Errors</CardDescription>
            <CardTitle className={`text-2xl font-bold font-heading mt-1 ${metrics.errorCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
              {metrics.errorCount}
            </CardTitle>
          </CardHeader>
          <CardFooter className="p-4 pt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className={`flex items-center gap-1 font-medium ${metrics.errorCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
              <Icon name={metrics.errorCount > 0 ? "warning" : "check"} className="size-3.5! text-[14px]!" />
              {metrics.errorCount > 0 ? "Action required" : "No errors"}
            </span>
            <span>Shopify product catalog</span>
          </CardFooter>
        </Card>
      </div>

      {/* 2. Google Search & Filter Pills Area */}
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card/40 border border-border/80 p-3 rounded-xl">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4! text-[18px]!" />
            <Input
              type="text"
              placeholder="Search by order ID, customer name, email, or SKU..."
              className="pl-9 h-9 text-sm font-ui bg-background/50 focus-visible:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Icon name="close" className="size-4! text-[16px]!" />
              </button>
            )}
          </div>

          {/* Filtering Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
            {(["All", "Synced", "Pending", "Error", "Unfulfilled"] as const).map((filter) => {
              const isActive = selectedFilter === filter
              let label = filter === "Error" ? "Sync Issues" : filter === "Pending" ? "Sync Pending" : `${filter} Orders`
              if (filter === "All") label = "All Orders"

              return (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1 rounded-full text-xs font-ui font-medium border duration-150 shrink-0 select-none ${
                    isActive
                      ? "bg-blue-600/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800"
                      : "bg-background/40 hover:bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 3. Shopify Order Table (Google Sync style) */}
      <div className="px-4 lg:px-6">
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card/20 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-muted/40 font-heading text-xs font-medium text-muted-foreground border-b border-border/60">
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
                  <th className="p-3 font-semibold text-foreground font-heading">Order ID</th>
                  <th className="p-3 font-semibold text-foreground font-heading">Date</th>
                  <th className="p-3 font-semibold text-foreground font-heading">Customer</th>
                  <th className="p-3 font-semibold text-foreground font-heading">Items</th>
                  <th className="p-3 font-semibold text-foreground font-heading">Payment</th>
                  <th className="p-3 font-semibold text-foreground font-heading">Fulfillment</th>
                  <th className="p-3 font-semibold text-foreground font-heading text-right">Total</th>
                  <th className="p-3 font-semibold text-foreground font-heading text-center">Google Sync</th>
                  <th className="p-3 font-semibold text-foreground font-heading text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground font-ui">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Icon name="search_off" className="size-8 text-muted-foreground/60 text-[32px]!" />
                        <span className="font-semibold text-foreground">No orders found</span>
                        <span className="text-xs">Try adjusting your search query or filter chips.</span>
                        {(searchQuery || selectedFilter !== "All") && (
                          <Button
                            variant="link"
                            size="sm"
                            className="text-blue-600 dark:text-blue-400 mt-2 font-ui"
                            onClick={() => {
                              setSearchQuery("")
                              setSelectedFilter("All")
                            }}
                          >
                            Reset filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedRows.has(order.id)
                    const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0)
                    const itemSummary = order.items.map(i => `${i.qty}x ${i.name}`).join(", ")

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`hover:bg-muted/30 cursor-pointer duration-150 font-ui text-[13px] ${
                          isSelected ? "bg-blue-500/5 hover:bg-blue-500/10" : ""
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(val) => handleSelectRow(order.id, !!val)}
                            aria-label={`Select order ${order.id}`}
                          />
                        </td>
                        <td className="p-3 font-semibold text-foreground font-heading tabular-nums">{order.id}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {new Date(order.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{order.customer.name}</span>
                            <span className="text-[11px] text-muted-foreground">{order.customer.city}</span>
                          </div>
                        </td>
                        <td className="p-3 max-w-[200px] truncate text-muted-foreground" title={itemSummary}>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{order.items[0]?.name}</span>
                            {order.items.length > 1 && (
                              <span className="text-[11px] text-blue-600 dark:text-blue-400">
                                +{order.items.length - 1} other item{order.items.length > 2 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`px-2 py-0.5 rounded-md font-medium text-[11px] select-none ${
                              order.paymentStatus === "Paid"
                                ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                                : order.paymentStatus === "Pending"
                                ? "bg-amber-500/5 text-amber-600 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
                                : "bg-zinc-500/5 text-zinc-500 border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/30"
                            }`}
                          >
                            {order.paymentStatus}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`px-2 py-0.5 rounded-md font-medium text-[11px] select-none ${
                              order.fulfillmentStatus === "Fulfilled"
                                ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                                : order.fulfillmentStatus === "Partially Fulfilled"
                                ? "bg-blue-500/5 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30"
                                : "bg-amber-500/5 text-amber-600 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
                            }`}
                          >
                            {order.fulfillmentStatus === "Partially Fulfilled" ? "Part-fulfilled" : order.fulfillmentStatus}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-bold text-foreground font-heading tabular-nums">
                          {formatPrice(order.total, { currency: order.currency })}
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <Badge
                              variant="outline"
                              className={`px-2 py-0.5 rounded-md font-medium text-[11px] select-none flex items-center gap-1 ${
                                order.googleSync === "Synced"
                                  ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                                  : order.googleSync === "Pending"
                                  ? "bg-amber-500/5 text-amber-600 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
                                  : "bg-rose-500/5 text-rose-600 border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30"
                              }`}
                              title={order.syncMessage}
                            >
                              <Icon
                                name={
                                  order.googleSync === "Synced"
                                    ? "check"
                                    : order.googleSync === "Pending"
                                    ? "autorenew"
                                    : "error_outline"
                                }
                                className="size-3 text-[12px]!"
                              />
                              {order.googleSync}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 hover:bg-muted"
                              title="Sync Order"
                              disabled={isSingleSyncing === order.id}
                              onClick={(e) => handleSingleSync(order.id, e)}
                            >
                              <Icon
                                name="sync"
                                className={`size-4! text-[16px]! ${
                                  isSingleSyncing === order.id ? "animate-spin text-blue-600" : "text-muted-foreground"
                                }`}
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Google Detail Sheet Overlay */}
      <Sheet open={selectedOrder !== null} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="sm:max-w-md w-full bg-card shadow-2xl border-l flex flex-col h-full p-0">
          {selectedOrder && (
            <>
              {/* Sheet Header */}
              <SheetHeader className="p-5 border-b bg-muted/20">
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-ui text-muted-foreground uppercase tracking-wider font-semibold">Shopify Order</span>
                    <SheetTitle className="text-xl font-bold font-heading text-foreground">{selectedOrder.id}</SheetTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={`px-2 py-0.5 rounded-md font-medium text-xs select-none flex items-center gap-1.5 ${
                      selectedOrder.googleSync === "Synced"
                        ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                        : selectedOrder.googleSync === "Pending"
                        ? "bg-amber-500/5 text-amber-600 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
                        : "bg-rose-500/5 text-rose-600 border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30"
                    }`}
                  >
                    <Icon
                      name={
                        selectedOrder.googleSync === "Synced"
                          ? "check"
                          : selectedOrder.googleSync === "Pending"
                          ? "autorenew"
                          : "error_outline"
                      }
                      className="size-3.5 text-[14px]!"
                    />
                    {selectedOrder.googleSync}
                  </Badge>
                </div>
                <SheetDescription className="text-xs text-muted-foreground font-ui mt-1">
                  Ordered on {new Date(selectedOrder.date).toLocaleString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </SheetDescription>
              </SheetHeader>

              {/* Sheet Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 font-ui">
                {/* Customer Section */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Profile</span>
                  <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg border">
                    <div className="size-9 bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-sm select-none">
                      {selectedOrder.customer.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{selectedOrder.customer.name}</span>
                      <span className="text-xs text-muted-foreground">{selectedOrder.customer.email}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5 mt-1">
                        <Icon name="place" className="size-3 text-muted-foreground text-[12px]!" />
                        {selectedOrder.customer.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Items ({selectedOrder.items.length})</span>
                  <div className="flex flex-col border rounded-lg divide-y bg-background/50">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-start justify-between text-xs">
                        <div className="flex flex-col gap-1 pr-4">
                          <span className="font-semibold text-foreground leading-snug">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 font-medium font-mono text-right">
                          <span className="text-muted-foreground">{item.qty}x</span>
                          <span className="text-foreground">{formatPrice(item.price, { currency: selectedOrder.currency })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment & Total breakdown */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Breakdown</span>
                  <div className="border rounded-lg p-3 flex flex-col gap-2 bg-background/50 text-xs font-medium font-ui">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground font-mono">{formatPrice(selectedOrder.total * 0.9, { currency: selectedOrder.currency })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Tax</span>
                      <span className="text-foreground font-mono">{formatPrice(selectedOrder.total * 0.05, { currency: selectedOrder.currency })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping (Standard)</span>
                      <span className="text-foreground font-mono">{formatPrice(selectedOrder.total * 0.05, { currency: selectedOrder.currency })}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between items-center font-bold text-sm">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground font-mono">{formatPrice(selectedOrder.total, { currency: selectedOrder.currency })}</span>
                    </div>
                  </div>
                </div>

                {/* Google Merchant Sync Diagnostics */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Google Feed Diagnostics</span>
                  <div className={`border rounded-lg p-3 flex flex-col gap-2 bg-background/50 text-xs ${
                    selectedOrder.googleSync === "Error"
                      ? "border-rose-200 bg-rose-500/5 dark:border-rose-900/30 dark:bg-rose-500/5"
                      : selectedOrder.googleSync === "Pending"
                      ? "border-amber-200 bg-amber-500/5 dark:border-amber-900/30 dark:bg-amber-500/5"
                      : "border-emerald-200 bg-emerald-500/5 dark:border-emerald-900/30 dark:bg-emerald-500/5"
                  }`}>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Icon
                        name={selectedOrder.googleSync === "Error" ? "warning" : selectedOrder.googleSync === "Pending" ? "autorenew" : "check_circle"}
                        className={`size-4 text-[16px]! ${
                          selectedOrder.googleSync === "Error" 
                            ? "text-rose-600 dark:text-rose-400" 
                            : selectedOrder.googleSync === "Pending"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      />
                      <span className={
                        selectedOrder.googleSync === "Error" 
                          ? "text-rose-700 dark:text-rose-300" 
                          : selectedOrder.googleSync === "Pending"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-emerald-700 dark:text-emerald-300"
                      }>
                        {selectedOrder.googleSync === "Error" ? "Sync Issue Detected" : selectedOrder.googleSync === "Pending" ? "Sync Pending Approval" : "Successfully Synchronized"}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mt-1 text-[11.5px] font-ui">
                      {selectedOrder.syncMessage}
                    </p>
                    
                    {/* Event Timeline log for Google */}
                    <div className="mt-3 flex flex-col gap-3 pl-1 font-ui border-l border-border/80 ml-2">
                      <div className="relative pl-4">
                        <span className="absolute -left-[4.5px] top-1 bg-emerald-500 border border-card rounded-full size-2"></span>
                        <span className="text-[10px] text-muted-foreground block font-mono">May 20, 18:24</span>
                        <span className="text-xs text-foreground font-medium">Order created and registered on Shopify.</span>
                      </div>
                      <div className="relative pl-4">
                        <span className={`absolute -left-[4.5px] top-1 border border-card rounded-full size-2 ${
                          selectedOrder.googleSync === "Synced" ? "bg-emerald-500" : selectedOrder.googleSync === "Pending" ? "bg-amber-500" : "bg-rose-500"
                        }`}></span>
                        <span className="text-[10px] text-muted-foreground block font-mono">May 20, 18:25</span>
                        <span className="text-xs text-foreground font-medium">
                          {selectedOrder.googleSync === "Synced" 
                            ? "Feed feed sync verified with Google Merchant account."
                            : selectedOrder.googleSync === "Pending"
                            ? "Awaiting next automated Google Channel batch sync."
                            : "Sync aborted: validation error during feed assembly."}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sheet Footer */}
              <SheetFooter className="p-4 border-t bg-muted/10 flex flex-row items-center gap-3">
                <Button
                  variant="outline"
                  className="flex-1 font-ui text-xs h-9 bg-card hover:bg-muted"
                  asChild
                >
                  <a
                    href={`https://shopify.com/admin/orders/${selectedOrder.id.replace("ORD-", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon name="open_in_new" className="size-4! text-[16px]! text-muted-foreground mr-1.5" />
                    Open in Shopify
                  </a>
                </Button>

                {selectedOrder.googleSync !== "Synced" && (
                  <Button
                    className="flex-1 font-ui text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    onClick={() => handleSingleSync(selectedOrder.id)}
                    disabled={isSingleSyncing !== null}
                  >
                    <Icon
                      name="sync"
                      className={`size-4! text-[16px]! text-white mr-1.5 ${
                        isSingleSyncing === selectedOrder.id ? "animate-spin" : ""
                      }`}
                    />
                    Force Google Sync
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* 5. Google Workspace-style Floating Bulk Action Menu */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up select-none">
          <div className="flex items-center gap-3 bg-zinc-900 text-zinc-100 dark:bg-zinc-950 dark:border dark:border-zinc-800 px-4 py-2.5 rounded-full shadow-2xl font-ui text-xs font-semibold">
            {/* Selection indicators */}
            <div className="flex items-center gap-1.5 border-r border-zinc-700 pr-3">
              <Icon name="check_box" className="size-4! text-[18px]! text-blue-400" />
              <span>{selectedRows.size} Selected</span>
            </div>

            {/* Actions list */}
            <div className="flex items-center gap-1.5">
              {/* Bulk sync button */}
              <button
                className="flex items-center gap-1 hover:text-blue-400 hover:bg-zinc-800 px-2.5 py-1 rounded-full duration-150 active:bg-zinc-750"
                onClick={handleBulkSync}
                disabled={isBulkSyncing}
              >
                <Icon
                  name="sync"
                  className={`size-3.5! text-[14px]! ${isBulkSyncing ? "animate-spin text-blue-400" : ""}`}
                />
                Sync to Google
              </button>

              {/* Mark as synced */}
              <button
                className="flex items-center gap-1 hover:text-emerald-400 hover:bg-zinc-800 px-2.5 py-1 rounded-full duration-150 active:bg-zinc-750"
                onClick={handleBulkMarkSynced}
              >
                <Icon name="check_circle" className="size-3.5! text-[14px]!" />
                Mark Synced
              </button>

              <Separator orientation="vertical" className="bg-zinc-700 h-4 mx-1" />

              {/* Cancel / deselect */}
              <button
                className="hover:text-zinc-400 hover:bg-zinc-800 p-1 rounded-full duration-150"
                onClick={() => setSelectedRows(new Set())}
                title="Deselect All"
              >
                <Icon name="close" className="size-3.5! text-[14px]!" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
