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
    : (product.currency === currentCurrency ? product.price : "")

  const activeCompareAtPrice = currentPriceEntry?.compareAtPrice !== undefined
    ? currentPriceEntry.compareAtPrice
    : (product.currency === currentCurrency ? product.compareAtPrice : undefined)

  const activeCostPerItem = currentPriceEntry?.costPerItem !== undefined
    ? currentPriceEntry.costPerItem
    : (product.currency === currentCurrency ? product.costPerItem : undefined)

  const handlePriceFieldChange = (
    field: "price" | "compareAtPrice" | "costPerItem",
    val: number | ""
  ) => {
    setProduct((prev) => {
      if (!prev) return null
      const variants = [...(prev.variants || [])]
      if (!variants[0]) return prev

      const existingPrices = [...(variants[0].prices || [])]
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
          price: field === "price" ? val : (activePrice || ""),
          compareAtPrice: field === "compareAtPrice" ? val : (activeCompareAtPrice || ""),
          costPerItem: field === "costPerItem" ? val : (activeCostPerItem || ""),
        })
      }

      variants[0] = { ...variants[0], prices: updatedPrices }

      const updatedProd: Product = {
        ...prev,
        variants,
      }

      // If editing main currency, also update top-level product/variant shortcuts
      if (currentCurrency === (prev.currency || "SAR")) {
        if (field === "price") {
          updatedProd.price = val
          variants[0].price = val
        } else if (field === "compareAtPrice") {
          updatedProd.compareAtPrice = val
          variants[0].compareAtPrice = val
        } else if (field === "costPerItem") {
          updatedProd.costPerItem = val
          variants[0].costPerItem = val
        }
      }

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
              setProduct(prev => prev ? { ...prev, currency: newCurr } : null)
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

        {/* MOQ (Minimum Order Quantity) Input Saved in Specifications */}
        <div className="flex flex-col gap-2 md:col-span-2 pt-3 border-t border-border/60">
          <label className="text-[13px] font-medium text-foreground">MOQ (Minimum Order Quantity)</label>
          <input
            type="number"
            step="1"
            placeholder="e.g. 100"
            className="w-full md:w-1/2 h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
            value={product.specifications?.moq ?? product.specifications?.minOrderQuantity ?? product.specifications?.quantity ?? "100"}
            onChange={(e) => {
              const raw = e.target.value
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
                return { ...prev, specifications: updatedSpecs }
              })
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
