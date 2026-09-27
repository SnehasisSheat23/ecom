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
  const isTracking = product.trackQuantity ?? false
  const stockQty = product.quantity !== undefined && product.quantity !== "" 
    ? product.quantity 
    : ((product as any).stockQuantity ?? 100)

  // Extract packaging specs
  const specs = product.specifications || {}
  const [unitSize, setUnitSize] = React.useState<string>(() => {
    const raw = specs.unitSize || ""
    if (raw) return String(raw)
    const nw = specs.netWeight || ""
    const match = nw.match(/^([\d.]+)/)
    return match ? match[1] : ""
  })
  const [unitMeasure, setUnitMeasure] = React.useState<string>(() => {
    return specs.unitMeasure || product.weightUnit || "kg"
  })
  const [unitsPerCarton, setUnitsPerCarton] = React.useState<string>(() => {
    const raw = specs.unitsPerCarton || ""
    if (raw) return String(raw)
    const nw = specs.netWeight || specs.packSize || ""
    const match = nw.match(/(\d+)\s*[xX]/)
    return match ? match[1] : "1"
  })

  const syncPackagingSpecs = (newUnitSize: string, newUnitMeasure: string, newUnitsPerCarton: string) => {
    setProduct(prev => {
      if (!prev) return null
      const updatedSpecs = { ...(prev.specifications || {}) }
      
      const uSize = newUnitSize.trim()
      const uMeas = newUnitMeasure.trim()
      const uCount = newUnitsPerCarton.trim()

      if (uSize) updatedSpecs.unitSize = uSize
      if (uMeas) updatedSpecs.unitMeasure = uMeas
      if (uCount) updatedSpecs.unitsPerCarton = uCount

      // Format packSize e.g. "4 x 5 Kg" or "24 x 340 g"
      if (uCount && uSize) {
        const formattedPack = Number(uCount) > 1 
          ? `${uCount} x ${uSize} ${uMeas}`
          : `${uSize} ${uMeas}`
        updatedSpecs.packSize = formattedPack
        updatedSpecs.netWeight = formattedPack
        updatedSpecs.netWeightAr = formattedPack
      }

      // Calculate freight / gross carton weight in kg
      let singleWeightKg = parseFloat(uSize) || 0
      if (uMeas === 'g' || uMeas === 'gm' || uMeas === 'gr') singleWeightKg = singleWeightKg / 1000
      if (uMeas === 'ml') singleWeightKg = singleWeightKg / 1000
      const cartonWeight = Number((singleWeightKg * (parseInt(uCount) || 1)).toFixed(2))

      return {
        ...prev,
        weight: cartonWeight > 0 ? cartonWeight : prev.weight,
        weightUnit: 'kg',
        specifications: updatedSpecs
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold font-heading text-foreground">
          Inventory & Packaging
        </CardTitle>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-border/80 text-foreground focus:ring-ring size-3.5 cursor-pointer"
              checked={isTracking}
              onChange={(e) => {
                const checked = e.target.checked
                setProduct(prev => prev ? { 
                  ...prev, 
                  trackQuantity: checked,
                  quantity: checked ? (prev.quantity ?? 100) : 999999
                } : null)
              }}
            />
            <span>Track Stock Quantity</span>
          </label>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-4 text-sm">
        {/* Stock Quantity Input (Visible when tracking is enabled) - Standard form row without nested box */}
        {isTracking && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Available Stock on Hand (Cartons)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 100"
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono font-bold"
                value={product.quantity === "" ? "" : (product.quantity ?? 100)}
                onChange={(e) => {
                  const raw = e.target.value
                  const val = raw === "" ? "" : Math.max(0, parseInt(raw) || 0)
                  setProduct(prev => prev ? { ...prev, quantity: val } : null)
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5 justify-center">
              <label className="text-[13px] font-medium text-foreground">Backorders</label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  className="rounded border-border/80 text-foreground focus:ring-ring size-4 cursor-pointer"
                  checked={product.continueSellingWhenOutOfStock ?? false}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setProduct(prev => prev ? { ...prev, continueSellingWhenOutOfStock: checked } : null)
                  }}
                />
                <span>Continue selling when out of stock</span>
              </label>
            </div>
          </div>
        )}

        {/* Packaging & Weight Spec Helper */}
        <div className={`flex flex-col gap-3 ${isTracking ? 'pt-3 border-t border-border/60' : ''}`}>
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-foreground">
              Carton Packaging & Weight Specifications
            </label>
            {specs.packSize && (
              <span className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
                {specs.packSize}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Items per Carton</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 4"
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={unitsPerCarton}
                onChange={(e) => {
                  const val = e.target.value
                  setUnitsPerCarton(val)
                  syncPackagingSpecs(unitSize, unitMeasure, val)
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Unit Size</label>
              <input
                type="text"
                placeholder="e.g. 5 or 453.6"
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={unitSize}
                onChange={(e) => {
                  const val = e.target.value
                  setUnitSize(val)
                  syncPackagingSpecs(val, unitMeasure, unitsPerCarton)
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Unit Measure</label>
              <select
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                value={unitMeasure}
                onChange={(e) => {
                  const val = e.target.value
                  setUnitMeasure(val)
                  syncPackagingSpecs(unitSize, val, unitsPerCarton)
                }}
              >
                <option value="Kg">Kg (Kilograms)</option>
                <option value="g">g (Grams)</option>
                <option value="L">L (Liters)</option>
                <option value="ml">ml (Milliliters)</option>
                <option value="pcs">pcs (Pieces / Sachets)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Section (SKU, Barcode, MOQ) */}
        <details className="group pt-2 border-t border-border/60">
          <summary className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none flex items-center justify-between py-1 transition-colors list-none">
            <span>Advanced Identifiers & Logistics (SKU, Barcode, MOQ)</span>
            <span className="text-[11px] font-normal text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
          </summary>

          <div className="flex flex-col gap-3 pt-3 mt-1">
            {/* SKU & Barcode in Advanced */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">SKU (Stock Keeping Unit)</label>
                <input
                  type="text"
                  placeholder="e.g. AUTO or PROD-101"
                  className="w-full h-8 px-2.5 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                  value={product.sku || ""}
                  onChange={(e) => {
                    const val = e.target.value
                    setProduct(prev => prev ? { ...prev, sku: val } : null)
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">Barcode (UPC / EAN / GTIN)</label>
                <input
                  type="text"
                  placeholder="e.g. 6291100000000"
                  className="w-full h-8 px-2.5 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                  value={product.barcode || ""}
                  onChange={(e) => {
                    const val = e.target.value
                    setProduct(prev => prev ? { ...prev, barcode: val } : null)
                  }}
                />
              </div>
            </div>

            {/* MOQ & Step */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">Minimum Order Quantity (MOQ)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  className="w-full h-8 px-2.5 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">MOQ Order Step Increment</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  className="w-full h-8 px-2.5 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={product.moqStep === "" ? "" : (product.moqStep ?? 1)}
                  onChange={(e) => {
                    const raw = e.target.value
                    const val = raw === "" ? "" : Math.max(1, parseInt(raw) || 1)
                    setProduct(prev => prev ? { ...prev, moqStep: val } : null)
                  }}
                />
              </div>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}

