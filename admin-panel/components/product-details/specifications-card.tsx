"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { apiRequest } from "@/lib/api-client"
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
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploadingMouq, setIsUploadingMouq] = React.useState(false)
  const [newSpecKey, setNewSpecKey] = React.useState("")
  const [newSpecValue, setNewSpecValue] = React.useState("")

  const specs = product.specifications || {}
  const mouqFileUrl = specs.mouqFile || specs.mouq_file || ""

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

  const handleUploadMouqFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingMouq(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await apiRequest(`/admin/media`, {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const body = await res.json()
        const asset = body.data
        if (asset && asset.url) {
          updateSpecField("mouqFile", asset.url)
          toast.success("MOUQ Specification file uploaded successfully")
        } else {
          toast.error("Failed to upload MOUQ file")
        }
      } else {
        toast.error("Failed to upload MOUQ file")
      }
    } catch (err) {
      console.error("Error uploading MOUQ file:", err)
      toast.error("Error uploading MOUQ file")
    } finally {
      setIsUploadingMouq(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
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

  // Filter out internal / system spec keys from custom list
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
        <div className="flex items-center gap-2">
          <Icon name="description" className="size-5 text-primary" />
          <CardTitle className="text-base font-semibold font-heading text-foreground">
            Product Specifications & MOUQ File
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-5 text-sm">
        {/* Product MOUQ / Spec Sheet File Section */}
        <div className="p-4 bg-muted/30 border border-border/60 rounded-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-[13px] flex items-center gap-1.5">
                <Icon name="picture_as_pdf" className="size-4 text-emerald-600 dark:text-emerald-400" />
                Product MOUQ / Specification File
              </span>
              <span className="text-xs text-muted-foreground">
                Attach a PDF spec sheet or MOUQ document for this product
              </span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleUploadMouqFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
              disabled={isUploadingMouq}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="upload_file" className="size-4 text-primary" />
              {isUploadingMouq ? "Uploading..." : mouqFileUrl ? "Change MOUQ File" : "Upload MOUQ File"}
            </Button>
          </div>

          {/* MOUQ File Status / URL Field */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Or paste file URL (e.g. https://.../mouq-spec.pdf)"
              className="w-full h-8 px-3 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              value={mouqFileUrl}
              onChange={(e) => updateSpecField("mouqFile", e.target.value)}
            />
            {mouqFileUrl && (
              <a
                href={mouqFileUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 h-8 px-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs rounded-md font-semibold flex items-center gap-1 transition-colors"
              >
                <Icon name="open_in_new" className="size-3.5" />
                View File
              </a>
            )}
          </div>
        </div>

        {/* Standard Bilingual Specifications Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Brand */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {activeTab === 'ar' ? 'الماركة (Brand)' : 'Brand'}
            </label>
            <input
              type="text"
              className="w-full h-8 px-3 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. Abdullah Bakheet"
              value={activeTab === 'ar' ? (specs.brandAr || specs.brand || "") : (specs.brand || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "brandAr" : "brand", e.target.value)}
            />
          </div>

          {/* Net Weight / Pack Size */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {activeTab === 'ar' ? 'الوزن الصافي / الحجم (Net Weight)' : 'Net Weight / Pack Size'}
            </label>
            <input
              type="text"
              className="w-full h-8 px-3 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. 15.12 L (4 Gallons x 3.78 L)"
              value={activeTab === 'ar' ? (specs.netWeightAr || specs.netWeight || "") : (specs.netWeight || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "netWeightAr" : "netWeight", e.target.value)}
            />
          </div>

          {/* Country of Origin */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {activeTab === 'ar' ? 'بلد المنشأ (Country of Origin)' : 'Country of Origin'}
            </label>
            <input
              type="text"
              className="w-full h-8 px-3 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. Saudi Arabia"
              value={activeTab === 'ar' ? (specs.originAr || specs.origin || "") : (specs.origin || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "originAr" : "origin", e.target.value)}
            />
          </div>

          {/* Shelf Life */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {activeTab === 'ar' ? 'مدة الصلاحية (Shelf Life)' : 'Shelf Life'}
            </label>
            <input
              type="text"
              className="w-full h-8 px-3 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. 12 Months"
              value={activeTab === 'ar' ? (specs.shelfLifeAr || specs.shelfLife || "") : (specs.shelfLife || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "shelfLifeAr" : "shelfLife", e.target.value)}
            />
          </div>

          {/* Storage Instructions */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[12px] font-medium text-foreground">
              {activeTab === 'ar' ? 'شروط التخزين (Storage Instructions)' : 'Storage Instructions'}
            </label>
            <input
              type="text"
              className="w-full h-8 px-3 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. Store in a cool dry place below 25°C"
              value={activeTab === 'ar' ? (specs.storageAr || specs.storage || "") : (specs.storage || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "storageAr" : "storage", e.target.value)}
            />
          </div>

          {/* Certifications */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[12px] font-medium text-foreground">
              {activeTab === 'ar' ? 'الشهادات والتراخيص (Certifications)' : 'Certifications'}
            </label>
            <input
              type="text"
              className="w-full h-8 px-3 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. Halal Certified, HACCP Approved"
              value={activeTab === 'ar' ? (specs.certificationsAr || specs.certifications || "") : (specs.certifications || "")}
              onChange={(e) => updateSpecField(activeTab === 'ar' ? "certificationsAr" : "certifications", e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Additional Specifications Section */}
        <div className="border-t border-border/60 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
              Additional Specifications ({customSpecs.length})
            </span>
          </div>

          {/* List existing custom specs */}
          {customSpecs.length > 0 && (
            <div className="flex flex-col gap-2">
              {customSpecs.map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 bg-muted/20 p-2 rounded-md border border-border/40">
                  <span className="w-1/3 text-xs font-semibold text-foreground truncate" title={key}>
                    {key}:
                  </span>
                  <input
                    type="text"
                    className="flex-1 h-7 px-2 text-xs bg-background border border-border/60 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={val}
                    onChange={(e) => updateSpecField(key, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10 cursor-pointer shrink-0"
                    onClick={() => handleDeleteSpec(key)}
                  >
                    <Icon name="delete" className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Custom Spec Row */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Specification Name (e.g. Viscosity)"
              className="w-1/3 h-8 px-2.5 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newSpecKey}
              onChange={(e) => setNewSpecKey(e.target.value)}
            />
            <input
              type="text"
              placeholder="Value (e.g. High / Commercial Grade)"
              className="flex-1 h-8 px-2.5 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              className="h-8 text-xs px-3 font-medium text-primary border-primary/30 hover:bg-primary/5 cursor-pointer shrink-0"
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
