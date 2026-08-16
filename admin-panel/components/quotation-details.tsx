"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { apiRequest } from "@/lib/api-client"
import { formatPrice } from "@/lib/currency"
import { toast } from "sonner"

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

function QuotationStatusBadge({ status }: { status: string }) {
  let label = "Pending Review"
  let color = "bg-muted text-foreground border-border/60"

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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${color}`}>
      {label}
    </span>
  )
}

export function QuotationDetails({ id }: { id: string }) {
  const router = useRouter()
  const [quotation, setQuotation] = React.useState<Quotation | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  // Editable fields
  const [editItems, setEditItems] = React.useState<{ id: string; quotedUnitPrice: number; quantity: number }[]>([])
  const [editDiscount, setEditDiscount] = React.useState<number>(0)
  const [editShipping, setEditShipping] = React.useState<number>(0)
  const [editAdminNotes, setEditAdminNotes] = React.useState<string>("")
  const [editStatus, setEditStatus] = React.useState<string>("quoted")

  const loadQuotation = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await apiRequest(`/quotations/${id}`)
      if (res.ok) {
        const body = await res.json()
        if (body && body.data) {
          const q: Quotation = body.data
          setQuotation(q)
          setEditItems(
            (q.items || []).map((i: QuotationItem) => ({
              id: i.id,
              quotedUnitPrice: Number(i.quotedUnitPrice || i.originalUnitPrice || 0),
              quantity: i.requestedQuantity,
            }))
          )
          setEditDiscount(Number(q.discountAmount || 0))
          setEditShipping(Number(q.shippingCost || 0))
          setEditAdminNotes(q.adminNotes || "")
          setEditStatus(q.status === "pending_review" ? "quoted" : q.status)
        }
      } else {
        toast.error("Failed to load quotation details")
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Error loading quotation")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  React.useEffect(() => {
    loadQuotation()
  }, [loadQuotation])

  // Real-time calculations
  const itemsSubtotal = editItems.reduce((sum, item) => sum + item.quotedUnitPrice * item.quantity, 0)
  const discountedSubtotal = Math.max(0, itemsSubtotal - editDiscount)
  const vatRate = quotation?.currency === "SAR" ? 0.15 : 0.05
  const estimatedTax = Number((discountedSubtotal * vatRate).toFixed(2))
  const finalTotal = discountedSubtotal + editShipping + estimatedTax

  const handleSave = async () => {
    if (!quotation) return
    try {
      setIsSaving(true)
      const payload = {
        status: editStatus,
        items: editItems.map((i) => ({ id: i.id, quotedUnitPrice: i.quotedUnitPrice })),
        discountAmount: editDiscount,
        shippingCost: editShipping,
        adminNotes: editAdminNotes,
      }
      const res = await apiRequest(`/quotations/${quotation.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(`Quotation ${quotation.quoteNumber} saved successfully!`)
        loadQuotation()
      } else {
        const errBody = await res.json().catch(() => ({}))
        toast.error(errBody.message || "Failed to update quotation")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save quotation")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full font-ui min-h-0 p-6 md:p-8 animate-pulse gap-6">
        <div className="h-8 w-48 bg-muted/40 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="h-48 bg-muted/30 rounded-lg" />
            <div className="h-64 bg-muted/30 rounded-lg" />
          </div>
          <div className="flex flex-col gap-6">
            <div className="h-48 bg-muted/30 rounded-lg" />
            <div className="h-64 bg-muted/30 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 font-ui">
        <div className="text-center max-w-sm flex flex-col items-center gap-3">
          <div className="p-3 bg-muted/40 rounded-full">
            <Icon name="warning" className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Quotation Not Found</h2>
          <p className="text-sm text-muted-foreground leading-normal">
            The quotation ID &quot;{id}&quot; could not be found or has been deleted.
          </p>
          <Link href="/dashboard/quotations" className="mt-2">
            <Button size="sm" className="cursor-pointer">Back to Quotations List</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full font-ui min-h-0">
      {/* Top Header Bar */}
      <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center justify-between gap-3.5 shrink-0 border-b border-border/60">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard/quotations"
            className="text-muted-foreground hover:text-foreground duration-200 flex items-center justify-center size-8 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <Icon name="arrow_back" className="size-5 text-[20px]" />
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-heading text-foreground tracking-tight leading-none font-mono">
              Quote {quotation.quoteNumber}
            </h2>
            <span className="text-xs text-muted-foreground select-none">
              {new Date(quotation.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={isSaving}
            onClick={handleSave}
            className="h-8 shadow-xs text-xs px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer font-semibold"
          >
            {isSaving ? (
              <>
                <Icon name="progress_activity" className="size-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="send" className="size-3.5 mr-1.5" />
                {quotation.status === "pending_review" ? "Send Official Quote" :
                 quotation.status === "quoted" ? "Send Revised Quote" :
                 quotation.status === "converted" ? "Save Changes" :
                 "Update Quote"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content (Scrollable 2-Column Layout matching order-details.tsx) */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-2 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column (Products & Pricing Breakdown, Notes) */}
        <div className="flex-1 w-full flex flex-col gap-6">
          
          {/* Requested Products & Pricing with Integrated Financial Breakdown Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold font-heading text-foreground">Requested Products & Pricing</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Customize and override quoted unit prices for this client.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border/60 font-mono">
                Currency: {quotation.currency}
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-4">
              {/* Product Items List */}
              <div className="flex flex-col gap-5 divide-y divide-border/60">
                {(!quotation.items || quotation.items.length === 0) ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No product items attached to this quotation request.
                  </div>
                ) : (
                  quotation.items.map((item, idx) => {
                    const editItem = editItems.find((e) => e.id === item.id) || {
                      id: item.id,
                      quotedUnitPrice: item.quotedUnitPrice || item.originalUnitPrice,
                      quantity: item.requestedQuantity,
                    }
                    const lineTotal = (editItem.quotedUnitPrice || 0) * (editItem.quantity || 1)
                    const snap = item.productNameSnapshot
                    const title = typeof snap === "object" ? snap?.en || snap?.title || "Product Item" : String(snap || "Product Item")
                    const img = typeof snap === "object" ? snap?.imageUrl || snap?.image : (item as any).imageUrl || null

                    return (
                      <div key={item.id || idx} className={`flex flex-col md:flex-row md:items-center justify-between gap-5 ${idx > 0 ? "pt-5" : ""}`}>
                        {/* Left: Product Thumbnail & Details */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="size-16 bg-muted/40 border border-border/60 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt={title} className="size-full object-cover" />
                            ) : (
                              <Icon name="inventory_2" className="text-muted-foreground/40 size-6" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-foreground leading-snug">{title}</h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="font-mono">SKU: {item.sku || "-"}</span>
                              <span>
                                <strong className="text-foreground font-mono">{formatPrice(Number(item.originalUnitPrice || 0), { currency: quotation.currency })}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Requested Quantity */}
                        <div className="flex flex-col gap-1 shrink-0 min-w-[90px]">
                          <span className="text-xs text-muted-foreground font-medium">Quantity</span>
                          <span className="text-sm font-bold font-mono text-foreground">{item.requestedQuantity} pcs</span>
                        </div>

                        {/* Right: Quoted Unit Price Input + Line Total */}
                        <div className="flex items-center gap-6 shrink-0">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-medium text-foreground">
                              Quoted Price / Unit
                            </label>
                            <div className="relative w-36">
                              <span className="absolute left-3 top-2 text-muted-foreground select-none font-medium text-sm">
                                {quotation.currency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                style={{ paddingLeft: `${Math.max(2, (quotation.currency?.length || 3) * 0.65 + 0.8)}rem` }}
                                value={editItem.quotedUnitPrice === 0 ? "" : editItem.quotedUnitPrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  setEditItems((prev) =>
                                    prev.map((i) => (i.id === item.id ? { ...i, quotedUnitPrice: val } : i))
                                  )
                                }}
                                className="w-full h-9 px-3 py-2 text-sm font-medium bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 min-w-[110px]">
                            <span className="text-[13px] font-medium text-foreground">Line Total</span>
                            <span className="text-base font-bold font-mono text-foreground leading-none mt-2">
                              {formatPrice(lineTotal, { currency: quotation.currency })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <Separator className="bg-border/60 my-2" />

              {/* Financial Calculation Breakdown */}
              <div className="flex flex-col gap-3.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-normal">
                    Subtotal • {editItems.reduce((acc, i) => acc + i.quantity, 0)} items
                  </span>
                  <span className="font-semibold text-foreground font-mono">
                    {formatPrice(itemsSubtotal, { currency: quotation.currency })}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-normal">Shipping Freight</span>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-2 text-muted-foreground select-none font-medium text-sm">
                      {quotation.currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      style={{ paddingLeft: `${Math.max(2, (quotation.currency?.length || 3) * 0.65 + 0.8)}rem` }}
                      value={editShipping === 0 ? "" : editShipping}
                      placeholder="0"
                      onChange={(e) => setEditShipping(parseFloat(e.target.value) || 0)}
                      className="w-full h-9 px-3 py-2 text-sm font-medium bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-normal">Special Discount</span>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-2 text-muted-foreground select-none font-medium text-sm">
                      {quotation.currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      style={{ paddingLeft: `${Math.max(2, (quotation.currency?.length || 3) * 0.65 + 0.8)}rem` }}
                      value={editDiscount === 0 ? "" : editDiscount}
                      placeholder="0"
                      onChange={(e) => setEditDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full h-9 px-3 py-2 text-sm font-medium text-foreground bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-normal">
                    Estimated VAT ({quotation.currency === "SAR" ? "15%" : "5%"})
                  </span>
                  <span className="font-medium text-foreground font-mono">
                    {formatPrice(estimatedTax, { currency: quotation.currency })}
                  </span>
                </div>
              </div>

              <Separator className="bg-border/60 my-2" />

              {/* Total */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-base font-bold font-heading text-foreground">Total Quoted</span>
                <span className="text-xl font-bold font-heading text-foreground tabular-nums font-mono">
                  {formatPrice(finalTotal, { currency: quotation.currency })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Request Notes Card */}
          {quotation.customerNotes && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold font-heading text-foreground">Customer Request Notes</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {quotation.customerNotes}
              </CardContent>
            </Card>
          )}

          {/* Sales Terms & Customer Notes */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Sales Terms & Customer Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-2">
              <textarea
                rows={4}
                placeholder="e.g. Valid for 14 days. Free tailgate unloading included. Payment via wire transfer or online link."
                value={editAdminNotes}
                onChange={(e) => setEditAdminNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <span className="text-xs text-muted-foreground">These terms and notes are sent directly on the quoted offer to the customer.</span>
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Customer & Company Details, Quotation Metadata) */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
          
          {/* Customer & Company Details Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Customer & Company</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3.5 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Company Name</span>
                <span className="text-sm font-semibold text-foreground">{quotation.companyName || "—"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Contact Person</span>
                <span className="text-sm font-medium text-foreground">{quotation.customerName}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Email Address</span>
                <span className="text-sm font-medium text-foreground">{quotation.customerEmail}</span>
              </div>
              {quotation.customerPhone && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Phone Number</span>
                  <span className="text-sm font-mono font-medium text-foreground">{quotation.customerPhone}</span>
                </div>
              )}
              {quotation.taxNumber && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">VAT / Tax ID</span>
                  <span className="text-sm font-mono font-medium text-foreground">{quotation.taxNumber}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quotation Metadata Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Quotation Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Quote Reference</span>
                <span className="text-sm font-mono font-semibold text-foreground">{quotation.quoteNumber}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Request Date</span>
                <span className="text-sm text-foreground">
                  {new Date(quotation.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {quotation.validUntil && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium">Valid Until</span>
                  <span className="text-sm text-foreground font-mono">
                    {new Date(quotation.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}
