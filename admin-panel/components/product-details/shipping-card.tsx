"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Product } from "./types"

interface ShippingCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
}

export function ShippingCard({
  product,
  setProduct,
}: ShippingCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="text-base font-semibold font-heading text-foreground">Shipping</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 pt-4 text-sm">
        {product.weight !== undefined && (
          <div className="flex flex-col gap-2 md:w-1/2 pr-3">
            <label className="text-[13px] font-medium text-foreground">Weight</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                className="h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md flex-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={product.weight === "" ? "" : (product.weight !== undefined ? product.weight : "")}
                onChange={(e) => {
                  const raw = e.target.value
                  const val = raw === "" ? "" : (parseFloat(raw) || 0)
                  setProduct(prev => {
                    if (!prev) return null
                    const variants = [...(prev.variants || [])]
                    if (variants[0]) variants[0] = { ...variants[0], weightGrams: val === "" ? 0 : Math.round(val * 1000) }
                    return { ...prev, weight: val, variants }
                  })
                }}
              />
              <select
                className="h-9 px-3 py-2 text-sm bg-muted border border-border/60 rounded-md text-muted-foreground w-20 text-center shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none cursor-pointer"
                value={product.weightUnit || "kg"}
                onChange={(e) => setProduct(prev => prev ? { ...prev, weightUnit: e.target.value } : null)}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="lb">lb</option>
                <option value="oz">oz</option>
              </select>
            </div>
          </div>
        )}
        
        {(product.countryOfOrigin || product.hsCode) && (
          <>
            <Separator className="bg-border/60" />
            <div className="flex flex-col gap-4">
              <h3 className="font-medium text-[13px] text-foreground select-none">Customs information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {product.countryOfOrigin && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-muted-foreground">Country/Region of origin</label>
                    <input
                      type="text"
                      className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={product.countryOfOrigin || ""}
                      onChange={(e) => {
                        const val = e.target.value
                        setProduct(prev => {
                          if (!prev) return null
                          const variants = [...(prev.variants || [])]
                          if (variants[0]) variants[0] = { ...variants[0], countryOfOrigin: val }
                          return { ...prev, countryOfOrigin: val, variants }
                        })
                      }}
                    />
                  </div>
                )}
                {product.hsCode && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-muted-foreground">HS (Harmonized System) code</label>
                    <input
                      type="text"
                      className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={product.hsCode || ""}
                      onChange={(e) => {
                        const val = e.target.value
                        setProduct(prev => {
                          if (!prev) return null
                          const variants = [...(prev.variants || [])]
                          if (variants[0]) variants[0] = { ...variants[0], hsCode: val }
                          return { ...prev, hsCode: val, variants }
                        })
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
