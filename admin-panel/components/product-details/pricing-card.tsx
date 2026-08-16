"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPrice } from "@/lib/currency"
import { Product } from "./types"

interface PricingCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
  currencySymbol: string
  profit: number
  margin: number
}

const AVAILABLE_CURRENCIES = ["SAR", "USD", "AED", "EUR", "GBP", "INR"]

export function PricingCard({
  product,
  setProduct,
  currencySymbol,
  profit,
  margin,
}: PricingCardProps) {
  const currentCurrency = product.currency || "SAR"
  const defaultVariant = product.variants?.[0]

  const currentPriceEntry = defaultVariant?.prices?.find(
    (p) => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase()
  )

  const activePrice = currentPriceEntry?.price !== undefined
    ? currentPriceEntry.price
    : (product.price !== undefined && product.price !== null ? product.price : "")

  const activeCompareAtPrice = currentPriceEntry?.compareAtPrice !== undefined
    ? currentPriceEntry.compareAtPrice
    : (product.compareAtPrice !== undefined && product.compareAtPrice !== null ? product.compareAtPrice : undefined)

  const activeCostPerItem = currentPriceEntry?.costPerItem !== undefined
    ? currentPriceEntry.costPerItem
    : (product.costPerItem !== undefined && product.costPerItem !== null ? product.costPerItem : undefined)

  const handlePriceFieldChange = (
    field: "price" | "compareAtPrice" | "costPerItem",
    val: number | ""
  ) => {
    setProduct((prev) => {
      if (!prev) return null

      // Always update top-level product field directly
      const updatedProd: Product = {
        ...prev,
        [field]: val,
      }

      // Ensure variants array exists
      const variants = [...(prev.variants || [])]
      if (variants.length === 0) {
        variants.push({
          id: `var-${Date.now()}`,
          name: "Default Variant",
          sku: prev.sku || "",
          trackInventory: true,
          inventory: prev.quantity || 100,
          allowBackorder: false,
          price: field === "price" ? val : 0,
          prices: [
            {
              currencyCode: currentCurrency,
              price: field === "price" ? (Number(val) || 0) : 0,
              ...(field !== "price" ? { [field]: val } : {}),
            },
          ],
        })
      } else {
        const targetVar = { ...variants[0] }
        const existingPrices = [...(targetVar.prices || [])]
        const priceIdx = existingPrices.findIndex(
          (p) => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase()
        )

        const updatedPrices = [...existingPrices]
        if (priceIdx >= 0) {
          updatedPrices[priceIdx] = {
            ...updatedPrices[priceIdx],
            [field]: val,
          }
        } else {
          updatedPrices.push({
            currencyCode: currentCurrency,
            price: field === "price" ? val : (activePrice || 0),
            compareAtPrice: field === "compareAtPrice" ? val : activeCompareAtPrice,
            costPerItem: field === "costPerItem" ? val : activeCostPerItem,
            [field]: val,
          })
        }

        targetVar[field] = val
        targetVar.prices = updatedPrices
        variants[0] = targetVar
      }

      updatedProd.variants = variants
      return updatedProd
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold font-heading text-foreground">Pricing</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Currency:</span>
          <Select
            value={currentCurrency}
            onValueChange={(newCurr) => {
              setProduct((prev) => {
                if (!prev) return null
                const newPriceEntry = prev.variants?.[0]?.prices?.find(
                  (p) => p.currencyCode.toUpperCase() === newCurr.toUpperCase()
                )
                return {
                  ...prev,
                  currency: newCurr,
                  price: newPriceEntry?.price !== undefined && newPriceEntry?.price !== "" ? newPriceEntry.price : "",
                  compareAtPrice: newPriceEntry?.compareAtPrice !== undefined ? newPriceEntry.compareAtPrice : undefined,
                  costPerItem: newPriceEntry?.costPerItem !== undefined ? newPriceEntry.costPerItem : undefined,
                }
              })
            }}
          >
            <SelectTrigger size="sm" className="h-7 text-xs px-2.5 font-medium min-w-[80px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent align="end">
              {AVAILABLE_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-sm">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-foreground">Price</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-muted-foreground select-none font-medium">{currencySymbol}</span>
            <input
              type="number"
              step="0.01"
              style={{ paddingLeft: `${Math.max(2, (currencySymbol?.length || 1) * 0.65 + 0.8)}rem` }}
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={activePrice === "" ? "" : (activePrice || "")}
              onChange={(e) => {
                const raw = e.target.value
                const val = raw === "" ? "" : (parseFloat(raw) || 0)
                handlePriceFieldChange("price", val)
              }}
            />
          </div>
          {(activeCompareAtPrice === undefined || activeCostPerItem === undefined) && (
            <div className="flex flex-wrap gap-2.5 mt-2.5">
              {activeCompareAtPrice === undefined && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-muted/65 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/40 hover:border-primary/20 transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    handlePriceFieldChange("compareAtPrice", "")
                  }}
                >
                  <span className="text-sm font-semibold leading-none">+</span> Compare at price
                </button>
              )}
              {activeCostPerItem === undefined && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-muted/65 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/40 hover:border-primary/20 transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    handlePriceFieldChange("costPerItem", "")
                  }}
                >
                  <span className="text-sm font-semibold leading-none">+</span> Cost per item
                </button>
              )}
            </div>
          )}
        </div>
        {activeCompareAtPrice !== undefined && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground">Compare at price</label>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                onClick={() => {
                  setProduct(prev => {
                    if (!prev) return null
                    const variants = [...(prev.variants || [])]
                    if (variants[0]) {
                      const newVar = { ...variants[0] }
                      delete newVar.compareAtPrice
                      if (newVar.prices) {
                        newVar.prices = newVar.prices.map(p => 
                          p.currencyCode.toUpperCase() === currentCurrency.toUpperCase()
                            ? { ...p, compareAtPrice: undefined }
                            : p
                        )
                      }
                      variants[0] = newVar
                    }
                    const newProd = { ...prev, variants }
                    if (currentCurrency === (prev.currency || "SAR")) delete newProd.compareAtPrice
                    return newProd
                  })
                }}
              >
                Remove
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-muted-foreground select-none font-medium">{currencySymbol}</span>
              <input
                type="number"
                step="0.01"
                style={{ paddingLeft: `${Math.max(2, (currencySymbol?.length || 1) * 0.65 + 0.8)}rem` }}
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={activeCompareAtPrice === "" ? "" : (activeCompareAtPrice !== undefined ? activeCompareAtPrice : "")}
                onChange={(e) => {
                  const raw = e.target.value
                  const val = raw === "" ? "" : (parseFloat(raw) || 0)
                  handlePriceFieldChange("compareAtPrice", val)
                }}
              />
            </div>
          </div>
        )}
        
        {activeCostPerItem !== undefined && (
          <>
            <div className="md:col-span-2">
              <Separator className="bg-border/60 my-2" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-foreground">Cost per item</label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                  onClick={() => {
                    setProduct(prev => {
                      if (!prev) return null
                      const variants = [...(prev.variants || [])]
                      if (variants[0]) {
                        const newVar = { ...variants[0] }
                        delete newVar.costPerItem
                        if (newVar.prices) {
                          newVar.prices = newVar.prices.map(p => 
                            p.currencyCode.toUpperCase() === currentCurrency.toUpperCase()
                              ? { ...p, costPerItem: undefined }
                              : p
                          )
                        }
                        variants[0] = newVar
                      }
                      const newProd = { ...prev, variants }
                      if (currentCurrency === (prev.currency || "SAR")) delete newProd.costPerItem
                      return newProd
                    })
                  }}
                >
                  Remove
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground select-none font-medium">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  style={{ paddingLeft: `${Math.max(2, (currencySymbol?.length || 1) * 0.65 + 0.8)}rem` }}
                  className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={activeCostPerItem === "" ? "" : (activeCostPerItem !== undefined ? activeCostPerItem : "")}
                  onChange={(e) => {
                    const raw = e.target.value
                    const val = raw === "" ? "" : (parseFloat(raw) || 0)
                    handlePriceFieldChange("costPerItem", val)
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[13px] font-medium text-muted-foreground select-none">Profit</label>
                <div className="text-sm font-medium text-foreground pt-1.5">
                  {formatPrice(profit, { currency: product.currency })}
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[13px] font-medium text-muted-foreground select-none">Margin</label>
                <div className="text-sm font-medium text-foreground pt-1.5">
                  {margin.toFixed(1)}%
                </div>
              </div>
            </div>
          </>
        )}

        {/* MOQ (Minimum Order Quantity) Input */}
        <div className="flex flex-col gap-2 md:col-span-2 pt-3 border-t border-border/60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">MOQ (Minimum Order Quantity)</label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="e.g. 1"
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                value={product.moq === "" ? "" : (product.moq ?? product.specifications?.moq ?? 1)}
                onChange={(e) => {
                  const raw = e.target.value
                  const val = raw === "" ? "" : Math.max(1, parseInt(raw, 10) || 1)
                  setProduct(prev => {
                    if (!prev) return null
                    const updatedSpecs = { ...(prev.specifications || {}) }
                    if (raw === "") {
                      delete updatedSpecs.moq
                      delete updatedSpecs.minOrderQuantity
                    } else {
                      updatedSpecs.moq = raw
                      updatedSpecs.minOrderQuantity = raw
                    }
                    return { ...prev, moq: val, specifications: updatedSpecs }
                  })
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-foreground">Corporate Price</label>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">B2B </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground select-none font-medium">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Special contracted rate"
                  style={{ paddingLeft: `${Math.max(2, (currencySymbol?.length || 1) * 0.65 + 0.8)}rem` }}
                  className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono font-semibold"
                  value={(currentPriceEntry as any)?.corporatePrice ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value
                    const val = raw === "" ? undefined : (parseFloat(raw) || 0)
                    setProduct(prev => {
                      if (!prev) return null
                      const variants = [...(prev.variants || [])]
                      if (variants[0]) {
                        const targetVar = { ...variants[0] }
                        const prices = [...(targetVar.prices || [])]
                        const idx = prices.findIndex(p => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase())
                        if (idx >= 0) {
                          prices[idx] = { ...prices[idx], corporatePrice: val } as any
                        } else {
                          prices.push({ currencyCode: currentCurrency, price: 0, corporatePrice: val } as any)
                        }
                        targetVar.prices = prices
                        variants[0] = targetVar
                      }
                      return { ...prev, variants }
                    })
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Wholesale Quantity Breaks (Tiered Pricing) */}
        <div className="md:col-span-2 pt-4 border-t border-border/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Wholesale Bulk Pricing Tiers ({currentCurrency})</h4>
              <p className="text-xs text-muted-foreground">Define automated quantity discount breaks (e.g. 10–49 pcs, 50+ pcs).</p>
            </div>
            <button
              type="button"
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-muted hover:bg-muted/80 text-foreground cursor-pointer transition-colors"
              onClick={() => {
                setProduct(prev => {
                  if (!prev) return null
                  const variants = [...(prev.variants || [])]
                  if (variants[0]) {
                    const targetVar = { ...variants[0] }
                    const prices = [...(targetVar.prices || [])]
                    const idx = prices.findIndex(p => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase())
                    const currTiers = idx >= 0 && (prices[idx] as any).tieredPricing ? [...(prices[idx] as any).tieredPricing] : []
                    currTiers.push({ minQty: (currTiers.length + 1) * 10, maxQty: (currTiers.length + 1) * 10 + 39, price: Number(activePrice || 0) * 0.9 })
                    
                    if (idx >= 0) {
                      prices[idx] = { ...prices[idx], tieredPricing: currTiers } as any
                    } else {
                      prices.push({ currencyCode: currentCurrency, price: Number(activePrice || 0), tieredPricing: currTiers } as any)
                    }
                    targetVar.prices = prices
                    variants[0] = targetVar
                  }
                  return { ...prev, variants }
                })
              }}
            >
              + Add Quantity Tier
            </button>
          </div>

          {Array.isArray((currentPriceEntry as any)?.tieredPricing) && (currentPriceEntry as any).tieredPricing.length > 0 ? (
            <div className="border border-border/60 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/60 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3">Min Qty</th>
                    <th className="py-2 px-3">Max Qty (Optional)</th>
                    <th className="py-2 px-3">Tier Unit Price ({currencySymbol})</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {((currentPriceEntry as any).tieredPricing as any[]).map((tier, tIdx) => (
                    <tr key={tIdx}>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          value={tier.minQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1
                            setProduct(prev => {
                              if (!prev) return null
                              const variants = [...(prev.variants || [])]
                              const prices = [...(variants[0].prices || [])]
                              const pIdx = prices.findIndex(p => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase())
                              const tiers = [...((prices[pIdx] as any).tieredPricing || [])]
                              tiers[tIdx] = { ...tiers[tIdx], minQty: val }
                              prices[pIdx] = { ...prices[pIdx], tieredPricing: tiers } as any
                              variants[0].prices = prices
                              return { ...prev, variants }
                            })
                          }}
                          className="w-20 h-7 px-2 bg-background border border-border rounded font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          placeholder="∞ (Any)"
                          value={tier.maxQty || ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? undefined : (parseInt(e.target.value, 10) || undefined)
                            setProduct(prev => {
                              if (!prev) return null
                              const variants = [...(prev.variants || [])]
                              const prices = [...(variants[0].prices || [])]
                              const pIdx = prices.findIndex(p => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase())
                              const tiers = [...((prices[pIdx] as any).tieredPricing || [])]
                              tiers[tIdx] = { ...tiers[tIdx], maxQty: val }
                              prices[pIdx] = { ...prices[pIdx], tieredPricing: tiers } as any
                              variants[0].prices = prices
                              return { ...prev, variants }
                            })
                          }}
                          className="w-20 h-7 px-2 bg-background border border-border rounded font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={tier.price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setProduct(prev => {
                              if (!prev) return null
                              const variants = [...(prev.variants || [])]
                              const prices = [...(variants[0].prices || [])]
                              const pIdx = prices.findIndex(p => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase())
                              const tiers = [...((prices[pIdx] as any).tieredPricing || [])]
                              tiers[tIdx] = { ...tiers[tIdx], price: val }
                              prices[pIdx] = { ...prices[pIdx], tieredPricing: tiers } as any
                              variants[0].prices = prices
                              return { ...prev, variants }
                            })
                          }}
                          className="w-24 h-7 px-2 bg-background border border-border rounded font-mono font-bold"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
                          onClick={() => {
                            setProduct(prev => {
                              if (!prev) return null
                              const variants = [...(prev.variants || [])]
                              const prices = [...(variants[0].prices || [])]
                              const pIdx = prices.findIndex(p => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase())
                              const tiers = ((prices[pIdx] as any).tieredPricing || []).filter((_: any, idx: number) => idx !== tIdx)
                              prices[pIdx] = { ...prices[pIdx], tieredPricing: tiers } as any
                              variants[0].prices = prices
                              return { ...prev, variants }
                            })
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-3 px-4 rounded-md bg-muted/30 border border-dashed border-border/80 text-center text-xs text-muted-foreground">
              No bulk tiers configured for {currentCurrency}. Standard price applies for all order quantities.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
