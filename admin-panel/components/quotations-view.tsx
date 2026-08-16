"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { apiRequest } from "@/lib/api-client"
import { toast } from "sonner"
import { formatPrice } from "@/lib/currency"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export interface QuotationItem {
  id: string
  productId?: string
  sku?: string
  productNameSnapshot: any
  requestedQuantity: number
  originalUnitPrice: number
  quotedUnitPrice: number
  totalPrice: number
}

export interface Quotation {
  id: string
  quoteNumber: string
  customerId?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  companyName?: string
  taxNumber?: string
  status: "pending_review" | "quoted" | "accepted" | "rejected" | "expired" | "converted"
  currency: string
  subtotal: number
  discountAmount: number
  shippingCost: number
  taxAmount: number
  totalAmount: number
  adminNotes?: string
  customerNotes?: string
  validUntil?: string
  paymentLink?: string
  createdAt: string
  items?: QuotationItem[]
}

const TABS = ["All", "Pending Review", "Quoted", "Accepted", "Converted", "Rejected"]

// Sparkline component matching orders-stats design
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

function QuotationStatusBadge({ status }: { status: string }) {
  let label = "Pending Review"
  let color = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"

  if (status === "quoted") {
    label = "Quoted / Sent"
    color = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
  } else if (status === "accepted") {
    label = "Accepted"
    color = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
  } else if (status === "converted") {
    label = "Converted to Order"
    color = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
  } else if (status === "rejected") {
    label = "Rejected"
    color = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
  } else if (status === "expired") {
    label = "Expired"
    color = "bg-muted text-muted-foreground border-border/60"
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${color}`}>
      {label}
    </span>
  )
}

export function QuotationsView() {
  const router = useRouter()
  const [quotations, setQuotations] = React.useState<Quotation[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<string>("All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())

  // Search, Filter & Sort States
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)
  const [sortField, setSortField] = React.useState<"date" | "total" | "quoteNumber">("date")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  const [timeFilter, setTimeFilter] = React.useState<"today" | "7days" | "30days" | "all">("all")

  const fetchQuotations = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await apiRequest("/quotations")
      if (res.ok) {
        const body = await res.json()
        if (body && Array.isArray(body.data)) {
          setQuotations(body.data)
        }
      }
    } catch (err: any) {
      console.error("Failed to load quotations:", err)
      toast.error("Failed to load quotations from backend")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchQuotations()
  }, [fetchQuotations])

  // Filter & Sort Logic
  const filteredQuotations = React.useMemo(() => {
    let result = [...quotations]

    // 1. Tab filter
    if (activeTab === "Pending Review") {
      result = result.filter((q) => q.status === "pending_review")
    } else if (activeTab === "Quoted") {
      result = result.filter((q) => q.status === "quoted")
    } else if (activeTab === "Accepted") {
      result = result.filter((q) => q.status === "accepted")
    } else if (activeTab === "Converted") {
      result = result.filter((q) => q.status === "converted")
    } else if (activeTab === "Rejected") {
      result = result.filter((q) => q.status === "rejected")
    }

    // 2. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (item) =>
          item.quoteNumber.toLowerCase().includes(q) ||
          item.customerName.toLowerCase().includes(q) ||
          (item.companyName && item.companyName.toLowerCase().includes(q)) ||
          item.customerEmail.toLowerCase().includes(q)
      )
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortField === "date") {
        const timeA = new Date(a.createdAt).getTime()
        const timeB = new Date(b.createdAt).getTime()
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA
      } else if (sortField === "total") {
        return sortOrder === "asc" ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount
      } else {
        return sortOrder === "asc"
          ? a.quoteNumber.localeCompare(b.quoteNumber)
          : b.quoteNumber.localeCompare(a.quoteNumber)
      }
    })

    return result
  }, [quotations, activeTab, searchQuery, sortField, sortOrder])

  // Select all rows handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredQuotations.map((q) => q.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedRows)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedRows(next)
  }

  // Summary Metrics
  const pendingCount = quotations.filter((q) => q.status === "pending_review").length
  const quotedCount = quotations.filter((q) => q.status === "quoted").length
  const convertedTotal = quotations
    .filter((q) => q.status === "converted" || q.status === "accepted")
    .reduce((sum, q) => sum + Number(q.totalAmount || 0), 0)

  const filterLabelMap = {
    today: "Today",
    "7days": "Last 7 days",
    "30days": "Last 30 days",
    all: "All time",
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui animate-in fade-in duration-300">
      
      {/* Header section with title and actions */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground select-none">Quotations</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 shadow-xs text-xs px-3 cursor-pointer" onClick={fetchQuotations}>
            <Icon name="refresh" size={14} className="size-3.5 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" className="h-8 shadow-xs text-xs px-3 cursor-pointer">Export</Button>
        </div>
      </div>

      {/* Top Overview Stats Card */}
      <div className="border border-border/80 rounded-lg bg-card/40 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h3 className="text-sm font-semibold font-heading text-foreground">Quotations overview</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground font-medium gap-1 px-2 cursor-pointer">
                {filterLabelMap[timeFilter]}
                <Icon name="expand_more" size={14} className="size-3.5!" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 font-ui">
              <DropdownMenuRadioGroup value={timeFilter} onValueChange={(val) => setTimeFilter(val as any)}>
                <DropdownMenuRadioItem value="today" className="text-xs">Today</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="7days" className="text-xs">Last 7 days</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="30days" className="text-xs">Last 30 days</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="all" className="text-xs">All time</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60 pt-3">
          {/* Metric 1: Pending RFQs */}
          <div className="flex items-center justify-between px-3 py-2 md:py-0">
            <div>
              <span className="text-xs font-medium text-muted-foreground select-none">Pending Review</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold font-heading text-foreground font-mono">
                  {pendingCount}
                </span>
                <span className="text-[11px] text-muted-foreground">Requests</span>
              </div>
            </div>
            <Sparkline data={[2, 3, 5, 4, 6, 8, 5, 7, 9, 8, 12, 10, 14, 13, pendingCount || 4]} />
          </div>

          {/* Metric 2: Active Quoted */}
          <div className="flex items-center justify-between px-3 py-2 md:py-0">
            <div>
              <span className="text-xs font-medium text-muted-foreground select-none">Active Quotes Sent</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold font-heading text-foreground font-mono">
                  {quotedCount}
                </span>
                <span className="text-[11px] text-muted-foreground">Awaiting Client</span>
              </div>
            </div>
            <Sparkline data={[1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 8, 7, 9, 8, quotedCount || 6]} />
          </div>

          {/* Metric 3: Converted Pipeline */}
          <div className="flex items-center justify-between px-3 py-2 md:py-0">
            <div>
              <span className="text-xs font-medium text-muted-foreground select-none">Converted Pipeline</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold font-heading text-foreground font-mono">
                  {formatPrice(convertedTotal, { currency: "SAR" })}
                </span>
              </div>
            </div>
            <Sparkline data={[5, 6, 8, 7, 10, 12, 11, 14, 16, 18, 20, 22, 25, 28, 30]} />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="border border-border/80 border-b-0 rounded-t-lg rounded-b-none overflow-hidden bg-card/40 shadow-xs flex flex-col flex-1 min-h-0 mt-2">
        
        {/* Toolbar & Filter Tabs */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-2 h-12 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-fade-right pr-4 flex-1 min-w-0">
            {TABS.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab
                    ? "bg-muted text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-border/60 ml-auto shrink-0">
            {isSearchVisible ? (
              <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2 w-48 md:w-60 animate-in fade-in zoom-in-95 duration-200">
                <Icon name="search" size={14} className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search quote #, company..."
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
                <Button variant="outline" size="icon" className="h-8 w-8 bg-background shadow-xs cursor-pointer">
                  <Icon name="swap_vert" size={16} className="size-4! text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-ui">
                <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortField} onValueChange={(val) => setSortField(val as any)}>
                  <DropdownMenuRadioItem value="date" className="text-xs">Date</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="total" className="text-xs">Total Amount</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="quoteNumber" className="text-xs">Quote Number</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOrder} onValueChange={(val) => setSortOrder(val as "asc" | "desc")}>
                  <DropdownMenuRadioItem value="asc" className="text-xs">Ascending</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="desc" className="text-xs">Descending</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selected Rows Bulk Actions Bar Overlay */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-2 bg-background border-b border-border/60 text-foreground px-4 h-12 shrink-0 animate-in slide-in-from-top-4 duration-300">
            <span className="text-xs font-medium mr-2 text-muted-foreground">{selectedRows.size} selected</span>
            <Button 
              variant="ghost" 
              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setSelectedRows(new Set())}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Table Body */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full border-collapse text-left text-sm relative font-ui">
            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground text-[11px] font-medium uppercase sticky top-0 z-10 backdrop-blur-xs select-none">
              <tr>
                <th className="w-10 p-3 text-center">
                  <Checkbox
                    checked={selectedRows.size === filteredQuotations.length && filteredQuotations.length > 0}
                    onCheckedChange={(val) => handleSelectAll(!!val)}
                  />
                </th>
                <th className="p-3">Quote #</th>
                <th className="p-3">Client / Company</th>
                <th className="p-3">Status</th>
                <th className="p-3">Subtotal</th>
                <th className="p-3">Total (Inc. VAT)</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="h-[49px] animate-pulse">
                    <td className="p-3 text-center">
                      <div className="size-4 bg-muted/60 rounded mx-auto" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-24 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-36 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-20 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-20 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-24 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-20 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-7 w-16 bg-muted/60 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name="request_quote" size={24} className="size-8 text-muted-foreground/60" />
                      <span className="text-sm font-medium">No quotation requests found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => {
                  const isChecked = selectedRows.has(q.id)
                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-muted/30 cursor-pointer duration-150 text-[13px] ${
                        isChecked ? "bg-muted/40" : "bg-card/20"
                      }`}
                      onClick={() => router.push(`/dashboard/quotations/${q.id}`)}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(val) => handleSelectRow(q.id, !!val)}
                        />
                      </td>
                      <td className="p-3 font-mono font-semibold text-foreground whitespace-nowrap">
                        {q.quoteNumber}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div>
                          <p className="font-semibold text-foreground">{q.companyName || q.customerName}</p>
                          <p className="text-xs text-muted-foreground">{q.customerEmail}</p>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <QuotationStatusBadge status={q.status} />
                      </td>
                      <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                        {formatPrice(Number(q.subtotal || 0), { currency: q.currency || "SAR" })}
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground whitespace-nowrap">
                        {formatPrice(Number(q.totalAmount || 0), { currency: q.currency || "SAR" })}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium shadow-xs cursor-pointer"
                          onClick={() => router.push(`/dashboard/quotations/${q.id}`)}
                        >
                          Review & Quote
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-border/60 bg-card/40 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{filteredQuotations.length}</span> quotations
          </div>
        </div>
      </div>
    </div>
  )
}
