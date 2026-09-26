"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { apiRequest } from "@/lib/api-client"
import { formatPrice } from "@/lib/currency"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
  companyName?: string
  companyTaxId?: string
  crNumber?: string
  businessType?: string
  city: string
  province: string
  country: string
  deliveryAddress?: string
  crDocumentUrl?: string
  vatDocumentUrl?: string
  customerGroup?: "retail" | "wholesale" | "corporate"
  status?: "pending" | "approved" | "active" | "rejected" | "suspended" | string
  creditLimit?: number
  availableCredit?: number
  paymentTerms?: string
  ordersCount: number
  totalSpent: number
  lastOrderDate?: string
  lastOrderId?: string
  tags: string[]
  marketingConsent: boolean
  rejectionReason?: string
}

const TABS = ["All", "Email subscribers", "Returning"]

export function CustomersView({ filterGroup }: { filterGroup?: "all" | "corporate" | "retail" }) {
  const isCorporateView = filterGroup === "corporate"
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState(isCorporateView ? "All Corporate" : "All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const router = useRouter()

  // Server-side Pagination & Search States
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(50)
  const [total, setTotal] = React.useState(0)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)
  const [sortField, setSortField] = React.useState<keyof Customer>("name")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  // Debounce search query changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadCustomers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
      })
      if (debouncedSearch.trim()) {
        queryParams.set("search", debouncedSearch.trim())
      }
      if (isCorporateView) {
        queryParams.set("customerGroup", "corporate")
      } else {
        queryParams.set("customerGroup", "retail")
      }

      const res = await apiRequest(`/admin/customers?${queryParams.toString()}`)
      if (res.ok) {
        const body = await res.json()
        if (body.data) {
          const items = body.data.items || body.data || []
          const mapped = items.map((c: any) => ({
            id: c.id,
            name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.companyName || c.email.split("@")[0],
            email: c.email,
            phone: c.phone || "-",
            companyName: c.companyName || "",
            companyTaxId: c.companyTaxId || "",
            crNumber: c.crNumber || "",
            businessType: c.businessType || "",
            city: c.city || "-",
            province: c.province || c.city || "-",
            country: c.country || "-",
            deliveryAddress: c.deliveryAddress || "",
            crDocumentUrl: c.crDocumentUrl || "",
            vatDocumentUrl: c.vatDocumentUrl || "",
            customerGroup: c.customerGroup || "retail",
            status: c.status || "active",
            creditLimit: Number(c.creditLimit || 0),
            availableCredit: Number(c.availableCredit || 0),
            paymentTerms: c.paymentTerms || "prepaid",
            ordersCount: c.ordersCount || 0,
            totalSpent: c.totalSpent || 0,
            tags: c.tags || [],
            marketingConsent: false,
            rejectionReason: c.rejectionReason || "",
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
      setIsLoading(false)
    }
  }, [page, perPage, debouncedSearch, isCorporateView])

  React.useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // Approval & Rejection Handlers
  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await apiRequest(`/admin/customers/${id}/approve`, { method: "POST" })
      if (res.ok) {
        toast.success("Corporate account approved successfully! Welcome email sent.")
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: "approved" } : c))
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to approve account")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to approve account")
    }
  }

  const handleReject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await apiRequest(`/admin/customers/${id}/reject`, { method: "POST" })
      if (res.ok) {
        toast.info("Corporate application marked as rejected.")
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: "rejected" } : c))
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to reject account")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reject account")
    }
  }

  const handleSuspend = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      const res = await apiRequest(`/admin/customers/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "suspended" }),
      })
      if (res.ok) {
        toast.warning("Corporate account suspended.")
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: "suspended" } : c))
      } else {
        toast.error("Failed to suspend account")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to suspend account")
    }
  }

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm("Are you sure you want to delete this customer account?")) return
    try {
      const res = await apiRequest(`/admin/customers/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Account deleted successfully.")
      }
      setCustomers(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      setCustomers(prev => prev.filter(c => c.id !== id))
      toast.success("Account removed.")
    }
  }

  // Count pending accounts
  const pendingCount = React.useMemo(() => {
    return customers.filter(c => c.status === "pending" || c.status === "pending_approval").length
  }, [customers])

  // Dynamic Filtering & Sorting Logic
  const filteredCustomers = React.useMemo(() => {
    let result = [...customers]

    // 0. Base Group Filtering
    if (isCorporateView) {
      result = result.filter(c => c.customerGroup === "corporate" || c.customerGroup === "wholesale" || (c.companyName && c.companyName.trim().length > 0))

      // Ultra-clean 2 tabs: All Corporate & Pending
      if (activeTab === "Pending") {
        // Pending tab shows ONLY pending registration requests
        result = result.filter(c => c.status === "pending" || c.status === "pending_approval")
      } else {
        // All Corporate shows all approved/active accounts (pending strictly excluded)
        result = result.filter(c => c.status !== "pending" && c.status !== "pending_approval")
      }
    } else {
      result = result.filter(c => (c.customerGroup === "retail" || !c.customerGroup) && (!c.companyName || c.companyName.trim().length === 0))

      if (activeTab === "Email subscribers") {
        result = result.filter(c => c.marketingConsent)
      } else if (activeTab === "Returning") {
        result = result.filter(c => c.ordersCount > 1)
      }
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(c => {
        return c.name.toLowerCase().includes(query) || 
               (c.companyName && c.companyName.toLowerCase().includes(query)) ||
               (c.crNumber && c.crNumber.toLowerCase().includes(query)) ||
               (c.companyTaxId && c.companyTaxId.toLowerCase().includes(query)) ||
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
  }, [customers, activeTab, isCorporateView, searchQuery, sortField, sortOrder])

  // Row Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredCustomers.map(c => c.id)
      setSelectedRows(new Set(allFilteredIds))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedRows)
    if (checked) {
      next.add(id)
    } else {
      next.delete(id)
    }
    setSelectedRows(next)
  }

  const toggleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: keyof Customer) => {
    if (sortField !== field) return null
    return (
      <Icon 
        name={sortOrder === "asc" ? "arrow_upward" : "arrow_downward"} 
        size={14} 
        className="ml-1 inline size-3 text-muted-foreground" 
      />
    )
  }

  // Bulk Actions
  const handleBulkDelete = () => {
    setCustomers(prev => prev.filter(c => !selectedRows.has(c.id)))
    setSelectedRows(new Set())
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui animate-in fade-in duration-300">
      
      {/* Header section with title and actions */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground select-none">
            {isCorporateView ? "Corporate Accounts" : "Customers"}
          </h1>
          {isCorporateView && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Verify B2B commercial registration (CR), tax numbers, approve wholesale access, and manage credit lines.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 shadow-xs text-xs px-3 cursor-pointer">Export</Button>
          <Button 
            className="h-8 shadow-xs text-xs px-4 bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer"
            onClick={() => router.push(`/dashboard/customers/new`)}
          >
            {isCorporateView ? "Add Corporate Account" : "Add customer"}
          </Button>
        </div>
      </div>

      {/* Customers Table Container */}
      <div className="border border-border/80 rounded-lg overflow-hidden bg-card/40 shadow-xs flex flex-col flex-1 min-h-0 mt-2">
        
        {/* Toolbar & Filters */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-2 h-12 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mask-fade-right pr-4 flex-1 min-w-0">
            {isCorporateView ? (
              <>
                {/* 1. All Corporate Tab */}
                <Button
                  variant={activeTab === "All Corporate" ? "secondary" : "ghost"}
                  className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                    activeTab === "All Corporate"
                      ? "bg-muted text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab("All Corporate")}
                >
                  All Corporate
                </Button>

                {/* 2. Pending Tab */}
                <Button
                  variant={activeTab === "Pending" ? "secondary" : "ghost"}
                  className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                    activeTab === "Pending"
                      ? "bg-muted text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab("Pending")}
                >
                  <span>Pending</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </Button>
              </>
            ) : (
              TABS.map(tab => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "secondary" : "ghost"}
                  className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                    activeTab === tab ? "bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  <span>{tab}</span>
                </Button>
              ))
            )}
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-border/60 ml-auto shrink-0">
            {isSearchVisible ? (
              <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2 w-48 md:w-60 animate-in fade-in zoom-in-95 duration-200">
                <Icon name="search" size={14} className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder={isCorporateView ? "Search company, CR, tax ID..." : "Search customers..."}
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
            <thead className="sticky top-0 bg-card backdrop-blur-xs font-ui text-xs font-medium text-muted-foreground border-b border-border/60 z-10 select-none">
              <tr>
                <th className="w-10 p-3 text-center">
                  <Checkbox
                    checked={selectedRows.size === filteredCustomers.length && filteredCustomers.length > 0}
                    onCheckedChange={(val) => handleSelectAll(!!val)}
                  />
                </th>
                <th className="p-3 cursor-pointer select-none font-semibold text-foreground hover:text-foreground" onClick={() => toggleSort("name")}>
                  <div className="flex items-center">
                    {isCorporateView ? "Company & CR Info" : "Customer"} {renderSortIcon("name")}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none font-semibold text-foreground hover:text-foreground" onClick={() => toggleSort("email")}>
                  <div className="flex items-center">
                    {isCorporateView ? "Contact Person" : "Contact Email"} {renderSortIcon("email")}
                  </div>
                </th>
                {isCorporateView ? (
                  <>
                    <th className="p-3 font-semibold text-foreground">Location & CR Doc</th>
                    {activeTab === "Pending" && (
                      <th className="p-3 font-semibold text-foreground">Status</th>
                    )}
                    <th className="p-3 font-semibold text-foreground text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 cursor-pointer select-none font-semibold text-foreground hover:text-foreground" onClick={() => toggleSort("phone")}>
                      <div className="flex items-center">
                        Phone {renderSortIcon("phone")}
                      </div>
                    </th>
                    <th className="p-3 cursor-pointer select-none font-semibold text-foreground hover:text-foreground" onClick={() => toggleSort("city")}>
                      <div className="flex items-center">
                        Location {renderSortIcon("city")}
                      </div>
                    </th>
                  </>
                )}
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
                      <div className="h-3 w-32 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-3 w-40 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-3 w-28 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-3 w-24 bg-muted/60 rounded-full" />
                    </td>
                    {isCorporateView && (
                      <td className="p-3">
                        <div className="h-3 w-20 bg-muted/60 rounded-full ml-auto" />
                      </td>
                    )}
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={isCorporateView ? (activeTab === "Pending" ? 6 : 5) : 5} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name="business" size={24} className="size-8 text-muted-foreground/60" />
                      <span className="text-sm font-medium">No accounts found in this tab</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const isChecked = selectedRows.has(customer.id)
                  const isPending = customer.status === "pending" || customer.status === "pending_approval"
                  const isApproved = customer.status === "approved" || customer.status === "active"

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

                      {/* Company & Legal Info Column */}
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">
                              {customer.companyName || customer.name}
                            </span>
                            {customer.businessType && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-secondary text-secondary-foreground border border-border/50">
                                {customer.businessType}
                              </span>
                            )}
                            {customer.status === "suspended" && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                Suspended
                              </span>
                            )}
                          </div>
                          {customer.crNumber && (
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              CR: <span className="font-semibold text-foreground/80">{customer.crNumber}</span>
                            </p>
                          )}
                          {customer.companyTaxId && (
                            <p className="text-[10px] font-mono text-muted-foreground">
                              VAT: {customer.companyTaxId}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Contact Person Column */}
                      <td className="p-3 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-foreground">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.email}</p>
                          {customer.phone && customer.phone !== "-" && (
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              {customer.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {isCorporateView ? (
                        <>
                          {/* Location & CR Document */}
                          <td className="p-3 whitespace-nowrap">
                            <div>
                              <p className="text-xs font-medium text-foreground">
                                {customer.city !== "-" ? customer.city : "Saudi Arabia"}
                              </p>
                              {customer.crDocumentUrl ? (
                                <a
                                  href={customer.crDocumentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5 font-medium"
                                >
                                  <Icon name="description" size={13} className="size-3" />
                                  <span>View CR Certificate ↗</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">No certificate file</span>
                              )}
                            </div>
                          </td>

                          {/* Status Column - ONLY shown in Pending tab (clean & uncluttered) */}
                          {activeTab === "Pending" && (
                            <td className="p-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Pending Review
                              </span>
                            </td>
                          )}

                          {/* Action Buttons & More Actions Menu */}
                          <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-2.5 cursor-pointer shadow-xs"
                                    onClick={(e) => handleApprove(customer.id, e)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 px-2 cursor-pointer"
                                    onClick={(e) => handleReject(customer.id, e)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}

                              {/* More Actions Menu (Suspend, Delete, View, Copy Email) */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <Icon name="more_vert" size={16} className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 font-ui">
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                                    className="text-xs cursor-pointer"
                                  >
                                    <Icon name="visibility" size={14} className="size-3.5 mr-2 text-muted-foreground" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigator.clipboard?.writeText(customer.email)
                                      toast.success("Email copied to clipboard")
                                    }}
                                    className="text-xs cursor-pointer"
                                  >
                                    <Icon name="content_copy" size={14} className="size-3.5 mr-2 text-muted-foreground" />
                                    Copy Email
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {customer.status === "suspended" ? (
                                    <DropdownMenuItem
                                      onClick={(e) => handleApprove(customer.id, e)}
                                      className="text-xs cursor-pointer text-emerald-600 focus:text-emerald-600 font-medium"
                                    >
                                      <Icon name="check_circle" size={14} className="size-3.5 mr-2 text-emerald-600" />
                                      Reactivate Account
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={(e) => handleSuspend(customer.id, e)}
                                      className="text-xs cursor-pointer text-amber-600 focus:text-amber-600 font-medium"
                                    >
                                      <Icon name="pause_circle" size={14} className="size-3.5 mr-2 text-amber-600" />
                                      Suspend Account
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={(e) => handleDelete(customer.id, e)}
                                    className="text-xs cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 font-medium"
                                  >
                                    <Icon name="delete" size={14} className="size-3.5 mr-2 text-rose-600" />
                                    Delete Account
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {customer.phone}
                          </td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {customer.city !== "-" && customer.country !== "-" ? `${customer.city}, ${customer.country}` : (customer.city !== "-" ? customer.city : "-")}
                          </td>
                        </>
                      )}
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
              Showing {total > 0 ? (page - 1) * perPage + 1 : 0}–
              {Math.min(page * perPage, total)} of {total} {isCorporateView ? "corporate accounts" : "customers"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground mr-2">
              Page {page} of {Math.max(Math.ceil(total / perPage), 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs cursor-pointer"
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs cursor-pointer"
              disabled={page * perPage >= total}
              onClick={() => setPage(prev => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
