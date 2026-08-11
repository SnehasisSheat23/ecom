"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api-client"
import { toast } from "sonner"
import { ProductImage, MediaAsset } from "../types"

interface MediaGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (asset: MediaAsset) => Promise<void>
  productImages: ProductImage[]
}

export function MediaGalleryModal({
  isOpen,
  onClose,
  onSelect,
  productImages,
}: MediaGalleryModalProps) {
  const [galleryAssets, setGalleryAssets] = React.useState<MediaAsset[]>([])
  const [isFetchingGallery, setIsFetchingGallery] = React.useState(true)
  const [selectedGalleryAssetId, setSelectedGalleryAssetId] = React.useState<string | null>(null)
  const [isAdding, setIsAdding] = React.useState(false)
  const galleryFileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    let active = true

    const fetchAssets = async () => {
      try {
        const res = await apiRequest(`/admin/media?page=1&perPage=50`, {
          method: "GET",
        })
        if (res.ok && active) {
          const body = await res.json()
          setGalleryAssets(body.data?.items || [])
        }
      } catch (err) {
        console.error("Error fetching gallery assets:", err)
        toast.error("Failed to load media gallery")
      } finally {
        if (active) {
          setIsFetchingGallery(false)
        }
      }
    }

    fetchAssets()

    return () => {
      active = false
    }
  }, [])

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsFetchingGallery(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await apiRequest(`/admin/media`, {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const body = await res.json()
        if (body.data) {
          setGalleryAssets(prev => [body.data, ...prev])
          setSelectedGalleryAssetId(body.data.id)
          toast.success("Image uploaded to gallery")
        }
      } else {
        toast.error("Failed to upload image")
      }
    } catch (err) {
      console.error("Error uploading to gallery:", err)
      toast.error("Error uploading image")
    } finally {
      setIsFetchingGallery(false)
    }
  }

  const handleConfirmSelect = async () => {
    if (!selectedGalleryAssetId) return
    const asset = galleryAssets.find(a => a.id === selectedGalleryAssetId)
    if (!asset) return

    setIsAdding(true)
    try {
      await onSelect(asset)
      onClose()
    } catch (err) {
      console.error("Error linking image:", err)
    } finally {
      setIsAdding(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative bg-background border border-border rounded-lg shadow-lg max-w-2xl w-full flex flex-col font-ui p-6 gap-4">
        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight">Media Gallery</h2>
          <p className="text-sm text-muted-foreground">
            Select an image from your global files gallery or upload a new one.
          </p>
        </div>

        {/* Absolute positioned close button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer text-muted-foreground hover:text-foreground disabled:pointer-events-none"
          disabled={isAdding}
        >
          <Icon name="close" className="size-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Toolbar / Actions */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <span className="text-xs font-medium text-muted-foreground">Global Library Files</span>
          <Button 
            onClick={() => galleryFileInputRef.current?.click()}
            variant="outline"
            className="cursor-pointer font-medium"
            disabled={isAdding}
          >
            <Icon name="upload" className="size-4 mr-2" />
            Upload Image
          </Button>
          <input 
            type="file" 
            ref={galleryFileInputRef} 
            onChange={handleGalleryUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        {/* Content body */}
        <div className="max-h-[50vh] overflow-y-auto pr-1">
          {isFetchingGallery && galleryAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Icon name="progress_activity" className="size-6 animate-spin text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Loading gallery files...</p>
            </div>
          ) : galleryAssets.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg bg-muted/10">
              <Icon name="image" className="size-10 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">Media gallery is empty</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Upload images to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {galleryAssets.map((asset) => {
                const isSelected = selectedGalleryAssetId === asset.id
                const isAlreadyLinked = productImages?.some(img => img.url === asset.url)
                return (
                  <div 
                    key={asset.id}
                    onClick={() => {
                      if (isAlreadyLinked || isAdding) return
                      setSelectedGalleryAssetId(isSelected ? null : asset.id)
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden border transition-all ${
                      isAlreadyLinked
                        ? 'opacity-40 cursor-not-allowed border-border bg-muted/10'
                        : isSelected 
                          ? 'border-primary bg-accent/40 shadow-xs cursor-pointer' 
                          : 'border-border hover:border-foreground/40 cursor-pointer'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
                    
                    {isAlreadyLinked && (
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <span className="bg-black/75 text-white text-[9px] font-medium px-1.5 py-0.5 rounded">
                          Added
                        </span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md flex items-center justify-center">
                        <Icon name="check" size={10} className="size-2.5 text-white" />
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
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            disabled={!selectedGalleryAssetId || isAdding}
            onClick={handleConfirmSelect}
            className="cursor-pointer font-medium"
          >
            {isAdding ? "Adding..." : "Add to Product"}
          </Button>
        </div>
      </div>
    </div>
  )
}
