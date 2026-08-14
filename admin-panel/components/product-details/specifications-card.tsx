"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { toast } from "sonner"
import { Product } from "./types"

interface SpecificationsCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
  activeTab?: 'en' | 'ar'
}

export function SpecificationsCard({
  product,
  setProduct,
  activeTab = 'en',
}: SpecificationsCardProps) {
  const [newSpecKey, setNewSpecKey] = React.useState("")
  const [newSpecValue, setNewSpecValue] = React.useState("")

  const specs = product.specifications || {}

  const updateSpecField = (key: string, value: string) => {
    setProduct((prev) => {
      if (!prev) return null
      const updatedSpecs = { ...(prev.specifications || {}) }
      if (value.trim() === "") {
        delete updatedSpecs[key]
      } else {
        updatedSpecs[key] = value
      }
      return { ...prev, specifications: updatedSpecs }
    })
  }

  const handleAddCustomSpec = () => {
    if (!newSpecKey.trim()) {
      toast.error("Specification name cannot be empty")
      return
    }
    updateSpecField(newSpecKey.trim(), newSpecValue.trim())
    setNewSpecKey("")
    setNewSpecValue("")
    toast.success("Custom specification added")
  }

  const handleDeleteSpec = (key: string) => {
    setProduct((prev) => {
      if (!prev) return null
      const updatedSpecs = { ...(prev.specifications || {}) }
      delete updatedSpecs[key]
      return { ...prev, specifications: updatedSpecs }
    })
    toast.success(`Specification "${key}" removed`)
  }

  const standardSpecKeys = new Set([
    "mouqFile",
    "mouq_file",
    "brand",
    "brandAr",
    "netWeight",
    "netWeightAr",
    "packSize",
    "origin",
    "originAr",
    "shelfLife",
    "shelfLifeAr",
    "storage",
    "storageAr",
    "certifications",
    "certificationsAr",
    "arabicName",
    "descriptionArabic",
    "descAr",
    "img",
    "price",
  ])

  const customSpecs = Object.entries(specs).filter(
    ([key]) => !standardSpecKeys.has(key)
  )

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold font-heading text-foreground">
          Specifications
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-5 text-sm">
        
        {/* Standard Specifications Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">
              {activeTab === 'ar' ? 'الماركة (Brand)' : 'Brand'}
            </label>
            <input
              type="text"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              placeholder="e.g. Abdullah Bakheet"
              value={activeTab === 'ar' ? (specs.brandAr || specs.brand || "") : (specs.brand || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "brandAr" : "brand", e.target.value)}
            />
          </div>

          {/* Net Weight / Pack Size */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">
              {activeTab === 'ar' ? 'الوزن الصافي / الحجم (Net Weight)' : 'Net Weight / Pack Size'}
            </label>
            <input
              type="text"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              placeholder="e.g. 15.12 L (4 Gallons x 3.78 L)"
              value={activeTab === 'ar' ? (specs.netWeightAr || specs.netWeight || "") : (specs.netWeight || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "netWeightAr" : "netWeight", e.target.value)}
            />
          </div>

          {/* Country of Origin */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">
              {activeTab === 'ar' ? 'بلد المنشأ (Country of Origin)' : 'Country of Origin'}
            </label>
            <input
              type="text"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              placeholder="e.g. Saudi Arabia"
              value={activeTab === 'ar' ? (specs.originAr || specs.origin || "") : (specs.origin || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "originAr" : "origin", e.target.value)}
            />
          </div>

          {/* Shelf Life */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">
              {activeTab === 'ar' ? 'مدة الصلاحية (Shelf Life)' : 'Shelf Life'}
            </label>
            <input
              type="text"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              placeholder="e.g. 12 Months"
              value={activeTab === 'ar' ? (specs.shelfLifeAr || specs.shelfLife || "") : (specs.shelfLife || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "shelfLifeAr" : "shelfLife", e.target.value)}
            />
          </div>

          {/* Storage Instructions */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-[13px] font-medium text-foreground">
              {activeTab === 'ar' ? 'شروط التخزين (Storage Instructions)' : 'Storage Instructions'}
            </label>
            <input
              type="text"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              placeholder="e.g. Store in a cool dry place below 25°C"
              value={activeTab === 'ar' ? (specs.storageAr || specs.storage || "") : (specs.storage || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "storageAr" : "storage", e.target.value)}
            />
          </div>

          {/* Certifications */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-[13px] font-medium text-foreground">
              {activeTab === 'ar' ? 'الشهادات والتراخيص (Certifications)' : 'Certifications'}
            </label>
            <input
              type="text"
              className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              placeholder="e.g. Halal Certified, HACCP Approved"
              value={activeTab === 'ar' ? (specs.certificationsAr || specs.certifications || "") : (specs.certifications || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "certificationsAr" : "certifications", e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Additional Specifications Section */}
        <div className="border-t border-border/60 pt-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
              Additional Specifications ({customSpecs.length})
            </span>
          </div>

          {/* List existing custom specs */}
          {customSpecs.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {customSpecs.map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 bg-muted/20 p-2.5 rounded-md border border-border/40">
                  <span className="w-1/3 text-xs font-semibold text-foreground truncate" title={key}>
                    {key}:
                  </span>
                  <input
                    type="text"
                    className="flex-1 h-8 px-2.5 text-xs bg-background border border-border/60 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                    value={val}
                    onChange={(e) => updateSpecField(key, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10 cursor-pointer shrink-0"
                    onClick={() => handleDeleteSpec(key)}
                  >
                    <Icon name="delete" className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Custom Spec Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Specification Name (e.g. Viscosity)"
              className="w-full sm:w-1/3 h-9 px-3 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              value={newSpecKey}
              onChange={(e) => setNewSpecKey(e.target.value)}
            />
            <input
              type="text"
              placeholder="Value (e.g. High / Commercial Grade)"
              className="flex-1 h-9 px-3 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              value={newSpecValue}
              onChange={(e) => setNewSpecValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddCustomSpec()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs px-3.5 font-medium text-primary border-primary/30 hover:bg-primary/5 cursor-pointer shrink-0"
              onClick={handleAddCustomSpec}
            >
              <Icon name="add" className="size-4 mr-1" /> Add Spec
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
