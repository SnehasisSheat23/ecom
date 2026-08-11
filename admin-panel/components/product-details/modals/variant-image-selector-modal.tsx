"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api-client"
import { toast } from "sonner"
import { ProductImage, Variant } from "../types"

interface VariantImageSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (imageId: string | null) => void
  images: ProductImage[]
  currentVariant: Variant | undefined
  productId: string
  onUploadSuccess: (newImage: ProductImage) => void
}

export function VariantImageSelectorModal({
  isOpen,
  onClose,
  onSelect,
  images,
  currentVariant,
  productId,
  onUploadSuccess,
}: VariantImageSelectorModalProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const mediaRes = await apiRequest(`/admin/media`, {
        method: "POST",
        body: formData,
      })
      
      if (!mediaRes.ok) {
        toast.error("Failed to upload image")
        return
      }
      
      const mediaBody = await mediaRes.json()
      const mediaAsset = mediaBody.data
      if (!mediaAsset || !mediaAsset.id) {
        toast.error("Failed to upload image")
        return
      }

      const nextPosition = images.length
      const linkRes = await apiRequest(`/admin/products/${productId}/images`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaId: mediaAsset.id, position: nextPosition }),
      })

      if (linkRes.ok) {
        const body = await linkRes.json()
        if (body.data) {
          const newImg: ProductImage = {
            id: body.data.id,
            url: body.data.url,
            variantId: body.data.variantId || null,
            position: body.data.position || 0,
            altText: body.data.altText || null,
          }
          toast.success("Image uploaded and added to product")
          onUploadSuccess(newImg)
          // Automatically select it for this variant
          onSelect(newImg.id)
        } else {
          toast.error("Failed to link image to product")
        }
      } else {
        toast.error("Failed to link image to product")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error uploading image")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="relative bg-background border border-border rounded-lg shadow-lg max-w-lg w-full flex flex-col font-ui p-6 gap-4">
        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight">Select Variant Image</h2>
          <p className="text-sm text-muted-foreground">
            Choose an image from the product&lsquo;s media library to link to this variant:
          </p>
        </div>

        {/* Absolute positioned close button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer text-muted-foreground hover:text-foreground"
          disabled={isUploading}
        >
          <Icon name="close" className="size-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Toolbar / Actions */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <span className="text-xs font-medium text-muted-foreground">Product Images</span>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
            className="cursor-pointer font-medium"
            disabled={isUploading}
          >
            <Icon name="upload" className="size-4 mr-1.5" />
            {isUploading ? "Uploading..." : "Upload New"}
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        {/* Content body */}
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {(!images || images.length === 0) ? (
            <div className="text-center py-10 border border-dashed border-border rounded-lg bg-muted/10 flex flex-col items-center">
              <Icon name="image" className="size-8 text-muted-foreground/60 mb-2" />
              <p className="text-xs font-medium text-foreground">No media available</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Upload a new image directly to this product:</p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="mt-4 cursor-pointer font-medium"
                disabled={isUploading}
              >
                <Icon name="upload" className="size-4 mr-1.5" />
                {isUploading ? "Uploading..." : "Upload Image"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {/* Option: None */}
              <div 
                onClick={() => onSelect(null)}
                className={`aspect-square border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all ${
                  currentVariant?.id && 
                  !images.some(img => img.variantId === currentVariant.id)
                    ? 'border-primary ring-1 ring-primary bg-accent/40'
                    : 'border-border hover:border-foreground/40'
                }`}
              >
                <Icon name="block" className="size-4 text-muted-foreground" />
                <span className="text-[9px] font-medium text-muted-foreground mt-1">None</span>
              </div>

              {/* Product Images */}
              {images.map((img) => {
                const isLinkedToThis = img.variantId === currentVariant?.id
                const isLinkedToOther = img.variantId && img.variantId !== currentVariant?.id
                return (
                  <div 
                    key={img.id}
                    onClick={() => {
                      if (isLinkedToThis) {
                        onSelect(null)
                      } else {
                        onSelect(img.id)
                      }
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-all ${
                      isLinkedToThis 
                        ? 'border-primary bg-accent/40 shadow-xs' 
                        : 'border-border hover:border-foreground/40'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="product" className="w-full h-full object-cover" />
                    
                    {isLinkedToThis && (
                      <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md flex items-center justify-center">
                        <Icon name="check" size={10} className="size-2.5 text-white" />
                      </div>
                    )}
                    {isLinkedToOther && (
                      <div className="absolute inset-0 bg-black/45 flex items-end p-1 justify-center">
                        <span className="text-[7px] text-white/90 font-medium truncate w-full text-center">
                          Other Variant
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-border pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="cursor-pointer font-medium"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
