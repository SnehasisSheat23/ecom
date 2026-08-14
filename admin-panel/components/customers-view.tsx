"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { apiRequest } from "@/lib/api-client"
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

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  ordersCount: number
  totalSpent: number
  lastOrderDate: string
  lastOrderId: string
  city: string
  province: string
  country: string
  tags: string[]
  marketingConsent: boolean
}

interface APICustomer {
  id: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  isAdmin?: boolean
  ordersCount?: number
  totalSpent?: number
  lastOrderDate?: string
  city?: string
}

const TABS = ["All", "Email subscribers", "Returning"]

export function CustomersView() {
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const router = useRouter()

  // Server-side Pagination & Search States
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(50)
  const [total, setTotal] = React.useState(0)
  const [tenantCurrency, setTenantCurrency] = React.useState<string>("INR")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)
  const [sortField, setSortField] = React.useState<keyof Customer>("name")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  // Debounce search query changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset to page 1 on new search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  React.useEffect(() => {
    let active = true
    async function loadCustomers() {
      setIsLoading(true)
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          perPage: String(perPage),
        })
        if (debouncedSearch.trim()) {
          queryParams.set("search", debouncedSearch.trim())
        }

        const res = await apiRequest(`/admin/customers?${queryParams.toString()}`)
        if (res.ok) {
          const body = await res.json()
          if (active && body.data) {
            const items = body.data.items || body.data || []
            const mapped = items.map((c: APICustomer) => ({
              id: c.id,
              name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email.split("@")[0],
              email: c.email,
              phone: c.phone || "-",
              ordersCount: c.ordersCount || 0,
              totalSpent: c.totalSpent || 0,
              city: (c as any).city || "-",
              province: (c as any).province || (c as any).city || "-",
              country: (c as any).country || "-",
              tags: (c as any).tags || [],
              marketingConsent: false,
            }))
            setCustomers(mapped)
            setTotal(body.data.total ?? mapped.length)
          }
        } else {
          console.error("Failed to fetch customers")
        }
      } catch (e) {
        console.error("Failed to load customers from API:", e)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadCustomers()
    return () => {
      active = false
    }
  }, [page, perPage, debouncedSearch])

  // Dynamic Filtering & Sorting Logic
  const filteredCustomers = React.useMemo(() => {
    let result = [...customers]

    // 1. Tab Segment Filtering
    if (activeTab === "Email subscribers") {
      result = result.filter(c => c.marketingConsent)
    } else if (activeTab === "Returning") {
      result = result.filter(c => c.ordersCount > 1)
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(c => {
        return c.name.toLowerCase().includes(query) || 
               c.email.toLowerCase().includes(query) ||
               c.city.toLowerCase().includes(query) ||
               c.country.toLowerCase().includes(query)
      })
    }

    // 3. Sorting Logic
    result.sort((a, b) => {
      const valA = a[sortField]
      const valB = b[sortField]

      if (typeof valA === 'string' && typeof valB === 'string') {
        const strA = valA.toLowerCase()
        const strB = valB.toLowerCase()
        if (strA < strB) return sortOrder === "asc" ? -1 : 1
        if (strA > strB) return sortOrder === "asc" ? 1 : -1
        return 0
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        if (valA < valB) return sortOrder === "asc" ? -1 : 1
        if (valA > valB) return sortOrder === "asc" ? 1 : -1
        return 0
      }

      return 0
    })

    return result
  }, [customers, activeTab, searchQuery, sortField, sortOrder])

  // Row Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredCustomers.map(c => c.id)
      setSelectedRows(new Set(allFilteredIds))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (customerId: string, checked: boolean) => {
    const newSelection = new Set(selectedRows)
    if (checked) {
      newSelection.add(customerId)
    } else {
      newSelection.delete(customerId)
    }
    setSelectedRows(newSelection)
  }

  const toggleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: keyof Customer) => {
    if (sortField !== field) {
      return <Icon name="swap_vert" size={14} className="size-3.5! text-muted-foreground opacity-30 hover:opacity-100 transition-opacity ml-0.5" />
    }
    return sortOrder === "asc"
      ? <Icon name="arrow_upward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5" />
      : <Icon name="arrow_downward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5" />
  }

  // Bulk Actions
  const handleBulkDelete = () => {
    setCustomers(prev => prev.filter(c => !selectedRows.has(c.id)))
    setSelectedRows(new Set())
  }

  const handleAddCustomer = () => {
    const newId = `CUST-00${customers.length + 1}`
    const newCustomer: Customer = {
      id: newId,
      name: "New Customer",
      email: `customer${customers.length + 1}@example.com`,
      phone: "+1 (555) 000-0000",
      ordersCount: 0,
      totalSpent: 0,
      lastOrderDate: "-",
      lastOrderId: "-",
      city: "Unknown",
      province: "Unknown",
      country: "United States",
      tags: [],
      marketingConsent: false
    }
    setCustomers(prev => [newCustomer, ...prev])
    router.push(`/dashboard/customers/${newId}`)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui animate-in fade-in duration-300">
      
      {/* Header section with title and actions */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground select-none">Customers</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 shadow-xs text-xs px-3 cursor-pointer">Export</Button>
          <Button variant="outline" className="h-8 shadow-xs text-xs px-3 cursor-pointer">Import</Button>
          <Button 
            className="h-8 shadow-xs text-xs px-4 bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer"
            onClick={handleAddCustomer}
          >
            Add customer
          </Button>
        </div>
      </div>

      {/* Customers Table Container */}
      <div className="border border-border/80 border-b-0 rounded-t-lg rounded-b-none overflow-hidden bg-card/40 shadow-xs flex flex-col flex-1 min-h-0 mt-2">
        
        {/* Toolbar & Filters */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-2 h-12 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-fade-right pr-4 flex-1 min-w-0">
            {TABS.map(tab => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab ? "bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
                  placeholder="Search customers..."
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
                <DropdownMenuRadioGroup value={sortField} onValueChange={(val) => setSortField(val as keyof Customer)}>
                    <DropdownMenuRadioItem value="name" className="text-xs">Name</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="email" className="text-xs">Email</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ordersCount" className="text-xs">Orders Count</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="city" className="text-xs">City</DropdownMenuRadioItem>
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
              <Button 
                variant="ghost" 
                className="h-8 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer ml-auto font-semibold"
                onClick={handleBulkDelete}
              >
                Delete
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
                      checked={selectedRows.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onCheckedChange={(val) => handleSelectAll(!!val)}
                    />
                  </th>
                  <th className="p-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("name")}>
                    <div className="flex items-center">
                      Customer {renderSortIcon("name")}
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("email")}>
                    <div className="flex items-center">
                      Email {renderSortIcon("email")}
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("phone")}>
                    <div className="flex items-center">
                      Phone {renderSortIcon("phone")}
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer select-none hover:text-foreground text-right" onClick={() => toggleSort("ordersCount")}>
                    <div className="flex items-center justify-end">
                      Orders {renderSortIcon("ordersCount")}
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("city")}>
                    <div className="flex items-center">
                      Location {renderSortIcon("city")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="h-[49px] animate-pulse">
                      <td className="p-3 text-center">
                        <div className="size-4 bg-muted/60 rounded mx-auto" />
                      </td>
                      <td className="p-3">
                        <div className="h-2.5 w-24 bg-muted/60 rounded-full" />
                      </td>
                      <td className="p-3">
                        <div className="h-2.5 w-40 bg-muted/60 rounded-full" />
                      </td>
                      <td className="p-3">
                        <div className="h-2.5 w-28 bg-muted/60 rounded-full" />
                      </td>
                      <td className="p-3 text-right">
                        <div className="h-2.5 w-8 bg-muted/60 rounded-full ml-auto" />
                      </td>
                      <td className="p-3">
                        <div className="h-2.5 w-24 bg-muted/60 rounded-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name="group" size={24} className="size-8 text-muted-foreground/60" />
                      <span className="text-sm font-medium">No customers found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const isChecked = selectedRows.has(customer.id)
                  return (
                    <tr
                      key={customer.id}
                      className={`hover:bg-muted/30 cursor-pointer duration-150 text-[13px] ${
                        isChecked ? "bg-muted/40" : "bg-card/20"
                      }`}
                      onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(val) => handleSelectRow(customer.id, !!val)}
                        />
                      </td>
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        {customer.name}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {customer.email}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {customer.phone}
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums">
                        {customer.ordersCount}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {customer.city !== "-" && customer.country !== "-" ? `${customer.city}, ${customer.country}` : (customer.city !== "-" ? customer.city : "-")}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-border/60 bg-card/40 text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {total === 0 ? 0 : (page - 1) * perPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(page * perPage, total)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{total}</span> customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 gap-1"
            >
              <Icon name="chevron_left" size={14} />
              Previous
            </Button>
            <span className="px-2 font-medium text-foreground">
              Page {page} of {Math.max(1, Math.ceil(total / perPage))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / perPage) || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 gap-1"
            >
              Next
              <Icon name="chevron_right" size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
