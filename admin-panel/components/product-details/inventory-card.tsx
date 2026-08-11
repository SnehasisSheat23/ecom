"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Product } from "./types"

interface InventoryCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
}

export function InventoryCard({
  product,
  setProduct,
}: InventoryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="text-base font-semibold font-heading text-foreground">Inventory</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-4 text-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="trackQuantity"
              checked={!!product.trackQuantity}
              onCheckedChange={(checked) => {
                setProduct(prev => {
                  if (!prev) return null
                  const isChecked = !!checked
                  const variants = [...(prev.variants || [])]
                  if (variants[0]) variants[0] = { ...variants[0], trackInventory: isChecked }
                  return { 
                    ...prev, 
                    trackQuantity: isChecked, 
                    quantity: isChecked ? (prev.quantity ?? 0) : prev.quantity,
                    variants 
                  }
                })
              }}
            />
            <label htmlFor="trackQuantity" className="text-[13px] font-medium text-foreground cursor-pointer select-none">
              Track quantity
            </label>
          </div>
          {product.trackQuantity && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="continueSelling"
                checked={!!product.continueSellingWhenOutOfStock}
                onCheckedChange={(checked) => {
                  setProduct(prev => {
                    if (!prev) return null
                    const variants = [...(prev.variants || [])]
                    if (variants[0]) variants[0] = { ...variants[0], allowBackorder: !!checked }
                    return { ...prev, continueSellingWhenOutOfStock: !!checked, variants }
                  })
                }}
              />
              <label htmlFor="continueSelling" className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                Continue selling when out of stock
              </label>
            </div>
          )}
        </div>

        {product.trackQuantity && (
          <>
            <Separator className="bg-border/60" />
            <div className="flex flex-col gap-2 w-full md:w-1/2 pr-3">
              <label className="text-[13px] font-medium text-foreground">Available</label>
              <input
                type="number"
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={product.quantity === "" ? "" : (product.quantity !== undefined ? product.quantity : 0)}
                onChange={(e) => {
                  const raw = e.target.value
                  const val = raw === "" ? "" : (parseInt(raw, 10) || 0)
                  setProduct(prev => {
                    if (!prev) return null
                    const variants = [...(prev.variants || [])]
                    if (variants[0]) variants[0] = { ...variants[0], inventory: val }
                    return { ...prev, quantity: val, variants }
                  })
                }}
              />
            </div>
          </>
        )}
 
        {(product.sku || product.barcode) && (
          <>
            <Separator className="bg-border/60" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {product.sku && (
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">SKU (Stock Keeping Unit)</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={product.sku || ""}
                    onChange={(e) => {
                      const val = e.target.value
                      setProduct(prev => {
                        if (!prev) return null
                        const variants = [...(prev.variants || [])]
                        if (variants[0]) variants[0] = { ...variants[0], sku: val }
                        return { ...prev, sku: val, variants }
                      })
                    }}
                  />
                </div>
              )}
              {product.barcode && (
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">Barcode (ISBN, UPC, GTIN, etc.)</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={product.barcode || ""}
                    onChange={(e) => {
                      const val = e.target.value
                      setProduct(prev => {
                        if (!prev) return null
                        const variants = [...(prev.variants || [])]
                        if (variants[0]) variants[0] = { ...variants[0], barcode: val }
                        return { ...prev, barcode: val, variants }
                      })
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
