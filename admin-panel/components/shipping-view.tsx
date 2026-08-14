"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { apiRequest } from "@/lib/api-client"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ShippingRateMap {
  AED: number
  SAR: number
  USD: number
  EUR: number
  INR: number
  [key: string]: number
}

export interface ShippingMethodItem {
  id: string
  name: string
  arabicName?: string | null
  description?: string | null
  arabicDescription?: string | null
  estimatedDays: string
  arabicEstimatedDays?: string | null
  isActive: boolean
  isDefault?: boolean
  rates: ShippingRateMap
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-xs bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400">
        <div className="size-1.5 rounded-full bg-emerald-500" />
        Active
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
      <div className="size-1.5 rounded-full bg-zinc-400" />
      Draft
    </div>
  )
}

const TABS = ["All", "Active", "Draft"]

export function ShippingView() {
  const [methods, setMethods] = React.useState<ShippingMethodItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingMethod, setEditingMethod] = React.useState<ShippingMethodItem | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  // Form Fields
  const [formName, setFormName] = React.useState("")
  const [formArabicName, setFormArabicName] = React.useState("")
  const [formDescription, setFormDescription] = React.useState("")
  const [formEstimatedDays, setFormEstimatedDays] = React.useState("2 - 4 business days")
  const [formIsActive, setFormIsActive] = React.useState(true)
  const [formIsDefault, setFormIsDefault] = React.useState(false)
  const [rateAED, setRateAED] = React.useState<string>("110")
  const [rateSAR, setRateSAR] = React.useState<string>("112")
  const [rateUSD, setRateUSD] = React.useState<string>("30")
  const [rateEUR, setRateEUR] = React.useState<string>("28")
  const [rateINR, setRateINR] = React.useState<string>("2500")

  const fetchShippingMethods = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await apiRequest("/shipping/methods")
      if (res.ok) {
        const body = await res.json()
        if (body.data?.items && Array.isArray(body.data.items)) {
          setMethods(body.data.items)
        }
      }
    } catch (e) {
      console.error("Failed to fetch shipping methods:", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchShippingMethods()
  }, [fetchShippingMethods])

  const handleOpenAddModal = () => {
    setEditingMethod(null)
    setFormName("")
    setFormArabicName("")
    setFormDescription("")
    setFormEstimatedDays("2 - 4 business days")
    setFormIsActive(true)
    setFormIsDefault(false)
    setRateAED("110")
    setRateSAR("112")
    setRateUSD("30")
    setRateEUR("28")
    setRateINR("2500")
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (method: ShippingMethodItem) => {
    setEditingMethod(method)
    setFormName(method.name || "")
    setFormArabicName(method.arabicName || "")
    setFormDescription(method.description || "")
    setFormEstimatedDays(method.estimatedDays || "2 - 4 business days")
    setFormIsActive(method.isActive)
    setFormIsDefault(Boolean(method.isDefault))
    setRateAED(String(method.rates?.AED ?? 110))
    setRateSAR(String(method.rates?.SAR ?? 112))
    setRateUSD(String(method.rates?.USD ?? 30))
    setRateEUR(String(method.rates?.EUR ?? 28))
    setRateINR(String(method.rates?.INR ?? 2500))
    setIsModalOpen(true)
  }

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error("Please enter a method name")
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        arabicName: formArabicName.trim() || null,
        description: formDescription.trim() || null,
        estimatedDays: formEstimatedDays.trim() || "2 - 4 business days",
        isActive: formIsActive,
        isDefault: formIsDefault,
        rates: {
          AED: parseFloat(rateAED) || 0,
          SAR: parseFloat(rateSAR) || 0,
          USD: parseFloat(rateUSD) || 0,
          EUR: parseFloat(rateEUR) || 0,
          INR: parseFloat(rateINR) || 0,
        },
      }

      if (editingMethod) {
        const res = await apiRequest(`/shipping/methods/${editingMethod.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to update shipping method")
        toast.success("Shipping method updated")
      } else {
        const res = await apiRequest("/shipping/methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to create shipping method")
        toast.success("Shipping method created")
      }

      setIsModalOpen(false)
      await fetchShippingMethods()
    } catch (err: any) {
      toast.error(err.message || "Failed to save shipping method")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMethod = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shipping method?")) return
    try {
      const res = await apiRequest(`/shipping/methods/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete shipping method")
      toast.success("Shipping method deleted")
      await fetchShippingMethods()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete shipping method")
    }
  }

  const filteredMethods = methods.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.arabicName && m.arabicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase())
    if (activeTab === "Active") return matchesSearch && m.isActive
    if (activeTab === "Draft") return matchesSearch && !m.isActive
    return matchesSearch
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Shipping</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage delivery options, timelines, and rates across currencies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-9 text-sm px-4 shadow-xs bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer font-medium"
            onClick={handleOpenAddModal}
          >
            <Icon name="add" className="size-4 mr-1.5" />
            Add method
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-border/80 rounded-xl overflow-hidden bg-card flex flex-col flex-1 shadow-xs">
        {/* Toolbar & Filters */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card px-3 h-12 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pr-4 flex-1 min-w-0">
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

          <div className="flex items-center gap-1.5 pl-3 border-l border-border/60 ml-auto shrink-0">
            {isSearchVisible ? (
              <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2.5 w-52 md:w-64 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
                <Icon name="search" size={16} className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search methods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none focus:outline-none text-xs text-foreground placeholder:text-muted-foreground w-full h-full pl-1 ml-0.5"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="hover:bg-muted p-0.5 rounded-full cursor-pointer">
                    <Icon name="close" size={14} className="size-3.5 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSearchVisible(false)
                    setSearchQuery("")
                  }}
                  className="hover:bg-muted p-0.5 rounded-full cursor-pointer"
                >
                  <Icon name="close" size={14} className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted/50 rounded-md cursor-pointer"
                onClick={() => setIsSearchVisible(true)}
              >
                <Icon name="search" size={16} className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground bg-muted/20 font-medium select-none">
                <th className="py-3 px-4 w-10">
                  <Checkbox
                    checked={selectedRows.size === filteredMethods.length && filteredMethods.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRows(new Set(filteredMethods.map((m) => m.id)))
                      } else {
                        setSelectedRows(new Set())
                      }
                    }}
                  />
                </th>
                <th className="py-3 px-4 font-medium">Method</th>
                <th className="py-3 px-4 font-medium">Delivery Time</th>
                <th className="py-3 px-4 font-medium">Rates (AED / SAR / USD / EUR / INR)</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
                      Loading shipping methods...
                    </div>
                  </td>
                </tr>
              ) : filteredMethods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                    No shipping methods found.
                  </td>
                </tr>
              ) : (
                filteredMethods.map((method) => {
                  const isSelected = selectedRows.has(method.id)
                  const rates = method.rates || {}
                  return (
                    <tr
                      key={method.id}
                      className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                        isSelected ? "bg-muted/40" : ""
                      }`}
                      onClick={() => handleOpenEditModal(method)}
                    >
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const updated = new Set(selectedRows)
                            if (checked) updated.add(method.id)
                            else updated.delete(method.id)
                            setSelectedRows(updated)
                          }}
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {method.name}
                          {method.isDefault && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        {method.arabicName && (
                          <div className="text-[11px] text-muted-foreground font-arabic mt-0.5">
                            {method.arabicName}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        {method.estimatedDays}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-foreground/90 flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">AED {rates.AED ?? 0}</span>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="text-muted-foreground">SAR {rates.SAR ?? 0}</span>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="text-muted-foreground">${rates.USD ?? 0}</span>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="text-muted-foreground">€{rates.EUR ?? 0}</span>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="text-muted-foreground">₹{rates.INR ?? 0}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge isActive={method.isActive} />
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(method)}
                            className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <Icon name="more_vert" className="size-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEditModal(method)}>
                                Edit details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteMethod(method.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Clean Edit / Add Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[540px] p-6">
          <form onSubmit={handleSaveMethod} className="space-y-5">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-base font-semibold">
                {editingMethod ? "Edit shipping method" : "Add shipping method"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Configure method details and flat rates for each currency.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Method Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Name</label>
                  <input
                    required
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Standard Regional Delivery"
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Arabic name</label>
                  <input
                    type="text"
                    value={formArabicName}
                    onChange={(e) => setFormArabicName(e.target.value)}
                    placeholder="الشحن الإقليمي القياسي"
                    dir="rtl"
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring font-arabic"
                  />
                </div>
              </div>

              {/* Timeline & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Delivery time</label>
                  <input
                    type="text"
                    value={formEstimatedDays}
                    onChange={(e) => setFormEstimatedDays(e.target.value)}
                    placeholder="2 - 4 business days"
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="size-3.5 rounded border-input text-primary focus:ring-ring"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                      className="size-3.5 rounded border-input text-primary focus:ring-ring"
                    />
                    Default
                  </label>
                </div>
              </div>

              {/* Currency Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">AED rate (Base)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={rateAED}
                    onChange={(e) => setRateAED(e.target.value)}
                    placeholder="110"
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">SAR rate (Saudi)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={rateSAR}
                    onChange={(e) => setRateSAR(e.target.value)}
                    placeholder="112"
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">USD rate ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={rateUSD}
                    onChange={(e) => setRateUSD(e.target.value)}
                    placeholder="30"
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">EUR rate (€)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={rateEUR}
                    onChange={(e) => setRateEUR(e.target.value)}
                    placeholder="28"
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">INR rate (₹)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={rateINR}
                    onChange={(e) => setRateINR(e.target.value)}
                    placeholder="2500"
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="h-8 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {isSaving ? "Saving..." : editingMethod ? "Save changes" : "Add method"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
