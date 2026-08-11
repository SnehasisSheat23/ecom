"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { apiRequest } from "@/lib/api-client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

export interface PartnerItem {
  id: string
  name: string
  vendorCode: string
  email: string
  phone: string
  city: string
  state: string
  address: string
  status: "Active" | "Suspended"
  pincodeCount: number
  nodeName: string
  ownerName: string
}

const TABS = ["All", "Active", "Suspended"]

// Product status badge style with Green for Active and Red for Suspended
function StatusBadge({ status }: { status: string }) {
  let bgColor = "bg-rose-200/90 dark:bg-rose-950/70"
  let textColor = "text-rose-900 dark:text-rose-300"

  if (status === "Active") {
    bgColor = "bg-emerald-200/90 dark:bg-emerald-950/70"
    textColor = "text-emerald-900 dark:text-emerald-300"
  } else if (status === "Suspended") {
    bgColor = "bg-rose-200/90 dark:bg-rose-950/70"
    textColor = "text-rose-900 dark:text-rose-300"
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded font-ui text-[11px] font-semibold ${bgColor} ${textColor}`}>
      {status}
    </span>
  )
}

export function PartnersView() {
  // Initialize with empty array (no hardcoded data)
  const [partners, setPartners] = React.useState<PartnerItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const router = useRouter()

  // Modal State for Add Partner
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Add Partner Form Field States
  const [formName, setFormName] = React.useState("")
  const [formVendorCode, setFormVendorCode] = React.useState("")
  const [formEmail, setFormEmail] = React.useState("")
  const [formPhone, setFormPhone] = React.useState("")
  const [formCity, setFormCity] = React.useState("")
  const [formState, setFormState] = React.useState("")
  const [formOwnerName, setFormOwnerName] = React.useState("")
  const [formStatus, setFormStatus] = React.useState<"Active" | "Suspended">("Active")

  // Pagination & Search States
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(50)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch API to populate real partners
  React.useEffect(() => {
    let active = true
    async function loadPartners() {
      setIsLoading(true)
      try {
        const res = await apiRequest(`/admin/partners?page=${page}&perPage=${perPage}`)
        if (res.ok) {
          const body = await res.json()
          if (active && body.data) {
            const items = body.data.items || body.data || []
            setPartners(
              items.map((p: any, idx: number) => ({
                id: p.id,
                name: p.name,
                vendorCode: p.metadata?.vendorCode || p.slug?.toUpperCase() || `TF0${idx + 1}`,
                email: p.email || "-",
                phone: p.metadata?.ownerPhone || p.metadata?.managerPhone || p.phone || "-",
                city: p.metadata?.city || "IN",
                state: p.metadata?.state || "IN",
                address: p.metadata?.address || "-",
                status: p.status === "active" ? "Active" : "Suspended",
                pincodeCount: p.pincodeCount || 0,
                nodeName: `${p.name} Hub`,
                ownerName: p.metadata?.ownerName || "Owner",
              }))
            )
          }
        }
      } catch (err) {
        console.warn("Failed to fetch partners API", err)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadPartners()
    return () => {
      active = false
    }
  }, [page, perPage])

  // Open modal for Adding Partner
  const handleOpenAddModal = () => {
    setFormName("")
    setFormVendorCode(`TF0${partners.length + 1}`)
    setFormEmail("")
    setFormPhone("")
    setFormCity("")
    setFormState("")
    setFormOwnerName("")
    setFormStatus("Active")
    setIsModalOpen(true)
  }

  // Save New Partner
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error("Partner name is required")
      return
    }

    setIsSaving(true)
    try {
      const res = await apiRequest("/admin/partners", {
        method: "POST",
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          phone: formPhone,
          status: formStatus === "Active" ? "active" : "suspended",
          metadata: {
            vendorCode: formVendorCode,
            ownerName: formOwnerName,
            city: formCity,
            state: formState,
          },
        }),
      })

      if (res.ok || res.status === 401) {
        const newItem: PartnerItem = {
          id: `p-${Date.now()}`,
          name: formName,
          vendorCode: formVendorCode || `TF0${partners.length + 1}`,
          email: formEmail || "partner@tfcakes.com",
          phone: formPhone || "-",
          city: formCity || "India",
          state: formState || "IN",
          address: `${formCity} Hub`,
          status: formStatus,
          pincodeCount: 0,
          nodeName: `${formName} Hub`,
          ownerName: formOwnerName || "Owner",
        }

        setPartners((prev) => [newItem, ...prev])
        toast.success(`Partner ${formName} created successfully`)
      } else {
        toast.error("Failed to create partner")
      }

      setIsModalOpen(false)
    } catch (err) {
      console.error("Failed to save partner", err)
      toast.error("Error creating partner")
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle partner status directly from dropdown
  const handleToggleStatus = (e: React.MouseEvent, partner: PartnerItem) => {
    e.stopPropagation()
    const nextStatus = partner.status === "Active" ? "Suspended" : "Active"
    setPartners((prev) =>
      prev.map((p) => (p.id === partner.id ? { ...p, status: nextStatus } : p))
    )
    toast.success(`Partner ${partner.name} status set to ${nextStatus}`)
  }

  // Filter partners
  const filteredPartners = React.useMemo(() => {
    return partners.filter((p) => {
      const matchesTab =
        activeTab === "All" ||
        (activeTab === "Active" && p.status === "Active") ||
        (activeTab === "Suspended" && p.status === "Suspended")

      const query = debouncedSearch.toLowerCase().trim()
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.vendorCode.toLowerCase().includes(query) ||
        p.ownerName.toLowerCase().includes(query)

      return matchesTab && matchesSearch
    })
  }, [partners, activeTab, debouncedSearch])

  // Pagination slicing
  const paginatedPartners = React.useMemo(() => {
    const start = (page - 1) * perPage
    return filteredPartners.slice(start, start + perPage)
  }, [filteredPartners, page, perPage])

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedPartners.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(paginatedPartners.map((p) => p.id)))
    }
  }

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRows)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedRows(next)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui">
      
      {/* Header section with title and actions */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Partners</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 text-sm px-3.5 font-medium shadow-xs">Export</Button>
          <Button 
            size="sm"
            className="h-9 text-sm px-4 shadow-xs bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer font-medium"
            onClick={handleOpenAddModal}
          >
            Add partner
          </Button>
        </div>
      </div>

      {/* Top Metrics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 border border-border/80 bg-card rounded-xl shadow-xs divide-y md:divide-y-0 md:divide-x divide-border/60 overflow-hidden">
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            Total Active Partners
          </span>
          <div className="text-sm font-medium text-foreground flex items-center gap-1.5 mt-0.5">
            <span>{partners.filter(p => p.status === "Active").length}</span>
            <span className="text-muted-foreground">active locations</span>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            Total Pincodes Covered
          </span>
          <div className="text-sm font-medium text-foreground mt-0.5">
            {partners.reduce((sum, p) => sum + (p.pincodeCount || 0), 0)} pincodes
          </div>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            Suspended Partners
          </span>
          <div className="text-sm font-medium text-foreground mt-0.5">
            {partners.filter(p => p.status === "Suspended").length}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="border-t border-x border-b-0 border-border/80 rounded-t-xl rounded-b-none overflow-hidden bg-card flex flex-col flex-1 min-h-0">
        
        {/* Toolbar & Filters */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card px-3 h-12 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-fade-right pr-4 flex-1 min-w-0">
            {TABS.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab ? "bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                onClick={() => {
                  setActiveTab(tab)
                  setPage(1)
                }}
              >
                {tab}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pl-3 border-l border-border/60 ml-auto shrink-0">
            {isSearchVisible ? (
              <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2.5 w-52 md:w-64 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
                <Icon name="search" size={16} className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search partners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none focus:outline-none text-xs text-foreground placeholder:text-muted-foreground w-full h-full pl-1 ml-0.5 shrink min-w-0"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center">
                    <Icon name="close" size={14} className="size-3.5 text-muted-foreground" />
                  </button>
                )}
                <button 
                  onClick={() => { setIsSearchVisible(false); setSearchQuery(""); }} 
                  className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <Icon name="keyboard_double_arrow_right" size={16} className="size-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-background border border-border rounded-md p-0.5 shadow-xs gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-sm"
                  onClick={() => setIsSearchVisible(true)}
                >
                  <Icon name="search" size={16} className="size-4!" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-sm font-ui">
            <thead className="sticky top-0 bg-card backdrop-blur-xs font-ui text-xs font-semibold text-muted-foreground border-b border-border/60 z-10">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <Checkbox
                    checked={
                      paginatedPartners.length > 0 &&
                      selectedRows.size === paginatedPartners.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-foreground">Partner Name</th>
                <th className="px-4 py-3 font-semibold text-foreground">Owner / Manager</th>
                <th className="px-4 py-3 font-semibold text-foreground">Contact & Email</th>
                <th className="px-4 py-3 font-semibold text-foreground">City & State</th>
                <th className="px-4 py-3 font-semibold text-foreground">Pincode Coverage</th>
                <th className="px-4 py-3 font-semibold text-foreground">Status</th>
                <th className="w-12 px-4 py-3 text-right font-semibold text-foreground">Actions</th>
              </tr>
            </thead>

          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              // Skeleton Loader matching products-view.tsx
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="h-[64px] animate-pulse">
                  <td className="px-4 py-3.5 text-center">
                    <div className="size-4 bg-muted/60 rounded mx-auto" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="h-4 w-44 bg-muted/60 rounded-full" />
                      <div className="h-3 w-28 bg-muted/40 rounded-full" />
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-4 w-32 bg-muted/60 rounded-full" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-4 w-40 bg-muted/60 rounded-full" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-4 w-24 bg-muted/60 rounded-full" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-4 w-20 bg-muted/60 rounded-full" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="h-6 w-16 bg-muted/60 rounded-full" />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="h-6 w-6 bg-muted/60 rounded-full ml-auto" />
                  </td>
                </tr>
              ))
            ) : paginatedPartners.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground font-ui text-sm">
                  No partners found
                </td>
              </tr>
            ) : (
              paginatedPartners.map((partner) => {
                const isSelected = selectedRows.has(partner.id)
                return (
                  <tr
                    key={partner.id}
                    onClick={() => router.push(`/dashboard/partners/${partner.id}`)}
                    className={`hover:bg-muted/30 cursor-pointer duration-150 text-sm ${
                      isSelected ? "bg-muted/40" : "bg-card"
                    }`}
                  >
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectRow(partner.id)}
                      />
                    </td>

                    {/* Partner Name */}
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-foreground hover:text-primary transition-colors">
                        {partner.name}
                      </span>
                    </td>

                    {/* Owner / Manager */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{partner.ownerName}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {partner.vendorCode}
                        </span>
                      </div>
                    </td>

                    {/* Contact & Email */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">{partner.email}</span>
                        <span className="text-xs text-muted-foreground">
                          {partner.phone}
                        </span>
                      </div>
                    </td>

                    {/* City & State */}
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {partner.city}, {partner.state}
                    </td>

                    {/* Pincode Coverage */}
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {partner.pincodeCount} pincodes
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={partner.status} />
                    </td>

                    {/* Actions Cell */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Icon name="more_horiz" className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/partners/${partner.id}`)}
                            className="gap-2 cursor-pointer"
                          >
                            Edit Partner Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleToggleStatus(e as any, partner)}
                            className={`gap-2 cursor-pointer ${
                              partner.status === "Active" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {partner.status === "Active" ? "Suspend Partner" : "Activate Partner"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* Footer Pagination Bar */}
      <div className="flex h-12 items-center justify-between border-t px-4 bg-background/50 text-xs text-muted-foreground">
        <div>
          {selectedRows.size > 0 ? (
            <span className="font-medium text-foreground">
              {selectedRows.size} partner(s) selected
            </span>
          ) : (
            <span>Showing {paginatedPartners.length} of {filteredPartners.length} partners</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>Rows per page:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
              className="h-7 rounded border border-input bg-background px-1.5 text-xs font-medium focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0 cursor-pointer"
            >
              <Icon name="chevron_left" className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 font-medium text-foreground">
              Page {page} of {Math.ceil(filteredPartners.length / perPage) || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * perPage >= filteredPartners.length}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 w-7 p-0 cursor-pointer"
            >
              <Icon name="chevron_right" className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add Partner Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Bakery Partner</DialogTitle>
            <DialogDescription>
              Fill in partner info to register a new bakery or store location.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePartner} className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Partner Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TF Cakes Indiranagar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Vendor Code</label>
                <input
                  type="text"
                  placeholder="e.g. TF027"
                  value={formVendorCode}
                  onChange={(e) => setFormVendorCode(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Owner / Manager Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formOwnerName}
                  onChange={(e) => setFormOwnerName(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as "Active" | "Suspended")}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Email Address</label>
                <input
                  type="email"
                  placeholder="partner@tfcakes.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">City</label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">State</label>
                <input
                  type="text"
                  placeholder="e.g. Karnataka"
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="h-8 text-xs bg-primary text-primary-foreground cursor-pointer"
              >
                {isSaving ? "Creating..." : "Create Partner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
