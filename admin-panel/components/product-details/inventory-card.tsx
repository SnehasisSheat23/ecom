"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
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
        <CardTitle className="text-base font-semibold font-heading text-foreground">
          Inventory & Identifiers
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-4 text-sm">
        {/* Unlimited Stock / Inventory Off Status Banner */}
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
          <Icon name="all_inclusive" className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Inventory Tracking Off (Unlimited Stock)</span>
            <span className="text-[11px] opacity-90">
              Quantity is not tracked for this product. Customers can order with unlimited stock availability.
            </span>
          </div>
        </div>

        {/* SKU & Barcode Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">SKU (Stock Keeping Unit)</label>
            <input
              type="text"
              placeholder="e.g. AUTO or PROD-101"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              value={product.sku || ""}
              onChange={(e) => {
                const val = e.target.value
                setProduct(prev => prev ? { ...prev, sku: val } : null)
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Barcode (ISBN, UPC, GTIN, etc.)</label>
            <input
              type="text"
              placeholder="e.g. 6291100000000"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              value={product.barcode || ""}
              onChange={(e) => {
                const val = e.target.value
                setProduct(prev => prev ? { ...prev, barcode: val } : null)
              }}
            />
          </div>
        </div>

        {/* MOQ & MOQ Step Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/60">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">MOQ (Minimum Order Quantity)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 1"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={product.moq === "" ? "" : (product.moq ?? 1)}
              onChange={(e) => {
                const raw = e.target.value
                const val = raw === "" ? "" : Math.max(1, parseInt(raw) || 1)
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
            <label className="text-[13px] font-medium text-foreground">MOQ Step (Order Increment)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 1"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={product.moqStep === "" ? "" : (product.moqStep ?? 1)}
              onChange={(e) => {
                const raw = e.target.value
                const val = raw === "" ? "" : Math.max(1, parseInt(raw) || 1)
                setProduct(prev => prev ? { ...prev, moqStep: val } : null)
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
