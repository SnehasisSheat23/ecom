"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { apiRequest } from "@/lib/api-client"
import { formatPrice } from "@/lib/currency"
import { toast } from "sonner"

import { Product, ProductImage, Variant, APIVariant, APICollection, APISalesChannel, APIProductImage, APICategory } from "./product-details/types"

import { GeneralInfoCard } from "./product-details/general-info-card"
import { PricingCard } from "./product-details/pricing-card"
import { InventoryCard } from "./product-details/inventory-card"
import { ShippingCard } from "./product-details/shipping-card"
import { VariantsCard } from "./product-details/variants-card"
import { SEOCard } from "./product-details/seo-card"
import { StatusCard } from "./product-details/status-card"
import { PublishingCard } from "./product-details/publishing-card"
import { CategoryCard } from "./product-details/category-card"
import { OrganizationCard } from "./product-details/organization-card"

import { ConfirmationModal } from "./product-details/modals/confirmation-modal"
import { VariantImageSelectorModal } from "./product-details/modals/variant-image-selector-modal"
import { MediaGalleryModal } from "./product-details/modals/media-gallery-modal"

function StatusBadge({ status }: { status: string }) {
  let bgColor = "bg-muted/50"
  let textColor = "text-zinc-600 dark:text-zinc-300"
  
  if (status === "Active") {
    bgColor = "bg-emerald-100 dark:bg-emerald-900/30"
    textColor = "text-emerald-800 dark:text-emerald-400"
  } else if (status === "Draft") {
    bgColor = "bg-blue-100/80 dark:bg-blue-900/30"
    textColor = "text-blue-800 dark:text-blue-400"
  } else if (status === "Archived") {
    bgColor = "bg-muted/50"
    textColor = "text-zinc-600 dark:text-zinc-300"
  }

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-[11px] ${bgColor} ${textColor}`}>
      {status}
    </div>
  )
}

export function ProductDetails({ id }: { id: string }) {
  const router = useRouter()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [initialProduct, setInitialProduct] = React.useState<Product | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isEditingSEO, setIsEditingSEO] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [isGeneratingDesc, setIsGeneratingDesc] = React.useState(false)
  const [showToast, setShowToast] = React.useState(false)
  const [isUploadingImage, setIsUploadingImage] = React.useState(false)
  const [variantToDeleteIdx, setVariantToDeleteIdx] = React.useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [isDeleteVariantModalOpen, setIsDeleteVariantModalOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'en' | 'ar'>('en')
  const [variantImageSelectorIdx, setVariantImageSelectorIdx] = React.useState<number | null>(null)
  const [expandedVariantIdxs, setExpandedVariantIdxs] = React.useState<Record<number, boolean>>({})

  // Media Gallery States
  const [isGalleryModalOpen, setIsGalleryModalOpen] = React.useState(false)

  const toggleExpandVariant = (idx: number) => {
    setExpandedVariantIdxs(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      // Step 1: Upload to general media gallery
      const mediaRes = await apiRequest(`/admin/media`, {
        method: "POST",
        body: formData,
      })
      
      if (!mediaRes.ok) {
        toast.error("Failed to upload image to media gallery")
        return
      }
      
      const mediaBody = await mediaRes.json()
      const mediaAsset = mediaBody.data
      if (!mediaAsset || !mediaAsset.id) {
        toast.error("Failed to upload image to media gallery")
        return
      }

      // Step 2: Link the media asset to this product
      const nextPosition = product?.images?.length || 0
      const linkRes = await apiRequest(`/admin/products/${id}/images`, {
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
          setProduct(prev => {
            if (!prev) return null
            const updatedImages = [...(prev.images || []), newImg].sort((a, b) => a.position - b.position)
            return {
              ...prev,
              images: updatedImages,
              image: updatedImages[0]?.url || prev.image,
            }
          })
          toast.success("Image uploaded and added to product")
        } else {
          toast.error("Failed to link image to product")
        }
      } else {
        toast.error("Failed to link image to product")
      }
    } catch (err) {
      console.error("Error uploading image:", err)
      toast.error("Error uploading image")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
      const res = await apiRequest(`/admin/images/${imageId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setProduct(prev => {
          if (!prev) return null
          const updatedImages = (prev.images || []).filter((img) => img.id !== imageId)
          return {
            ...prev,
            images: updatedImages,
            image: updatedImages[0]?.url || "https://placehold.co/300x300?text=No+Image",
          }
        })
        toast.success("Image deleted successfully")
      } else {
        toast.error("Failed to delete image")
      }
    } catch (err) {
      console.error("Error deleting image:", err)
      toast.error("Error deleting image")
    }
  }

  const handleMakePrimary = async (imageId: string) => {
    if (!product || !product.images) return
    const targetImage = product.images.find((img) => img.id === imageId)
    if (!targetImage || targetImage.position === 0) return

    try {
      const newImages = product.images.map((img) => {
        if (img.id === imageId) {
          return { ...img, position: 0 }
        } else if (img.position < targetImage.position) {
          return { ...img, position: img.position + 1 }
        }
        return img
      }).sort((a, b) => a.position - b.position)

      setProduct(prev => prev ? { ...prev, images: newImages, image: newImages[0]?.url || prev.image } : null)

      const promises = newImages.map((img) => {
        return apiRequest(`/admin/images/${img.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ position: img.position }),
        })
      })
      await Promise.all(promises)
      toast.success("Primary image updated")
    } catch (err) {
      console.error("Error setting primary image:", err)
      toast.error("Error setting primary image")
    }
  }

  const handleSelectVariantImage = async (imageId: string | null) => {
    if (variantImageSelectorIdx === null || !product || !product.variants) return
    const idx = variantImageSelectorIdx
    const variant = product.variants[idx]
    if (!variant.id) return

    try {
      const promises: Promise<Response>[] = []

      // 1. Find and clear variantId on the old linked image (if any)
      const oldImage = product.images?.find((img) => img.variantId === variant.id)
      if (oldImage && oldImage.id !== imageId) {
        promises.push(
          apiRequest(`/admin/images/${oldImage.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ variantId: null }),
          })
        )
      }

      // 2. Link the new image (if selected)
      if (imageId) {
        promises.push(
          apiRequest(`/admin/images/${imageId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ variantId: variant.id }),
          })
        )
      }

      await Promise.all(promises)

      // 3. Update local state
      setProduct(prev => {
        if (!prev) return null
        const newImages = (prev.images || []).map((img) => {
          // Clear old linked image if it was cleared
          if (oldImage && img.id === oldImage.id && img.id !== imageId) {
            return { ...img, variantId: null }
          }
          // Set new image linked variantId
          if (imageId && img.id === imageId) {
            return { ...img, variantId: variant.id! }
          }
          return img
        })
        return { ...prev, images: newImages }
      })

      toast.success("Variant image updated successfully")
    } catch (err) {
      console.error("Error setting variant image:", err)
      toast.error("Error setting variant image")
    } finally {
      setVariantImageSelectorIdx(null)
    }
  }

  const handleDeleteConfirm = async () => {
    try {
      const res = await apiRequest(`/admin/products/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        toast.success("Product deleted successfully")
        router.push("/dashboard/products")
      } else {
        toast.error("Failed to delete product")
      }
    } catch (e) {
      console.error("Failed to delete product:", e)
      toast.error("Network error deleting product")
    }
  }

  React.useEffect(() => {
    let active = true

    async function loadProduct() {
      try {
        const res = await apiRequest(`/admin/products/${id}`)
        if (res.ok) {
          const body = await res.json()
          if (active && body.data) {
            const p = body.data
            const defaultVariant = p.variants?.find((v: APIVariant) => v.isDefault) || p.variants?.[0]
            const priceFormatted = defaultVariant 
              ? formatPrice(defaultVariant.price, { currency: p.currency || "USD", isMinorUnit: true }) 
              : "-"
            
            const rawStatus = p.status || "draft"
            const capitalizedStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as "Active" | "Draft" | "Archived"
            
            const rawType = p.productType || "physical"
            const capitalizedType = rawType.charAt(0).toUpperCase() + rawType.slice(1)

            const mapped: Product = {
              id: p.id,
              image: p.images?.[0]?.url || "https://placehold.co/300x300?text=No+Image",
              images: p.images?.map((img: APIProductImage) => ({
                id: img.id,
                url: img.url,
                variantId: img.variantId || null,
                position: img.position || 0,
                altText: img.altText || null,
              })).sort((a: ProductImage, b: ProductImage) => a.position - b.position) || [],
              title: p.title,
              description: p.description || "",
              status: capitalizedStatus,
              inventory: defaultVariant?.sku ? `${defaultVariant.sku} (${priceFormatted})` : "No SKU",
              salesChannels: p.salesChannels?.length || 1,
              markets: 1,
              category: p.categories?.[0]?.name || "-",
              categoryIds: p.categories?.map((cat: APICategory) => cat.id) || [],
              type: capitalizedType,
              vendor: p.vendorName || "-",
              price: defaultVariant ? (defaultVariant.price !== undefined ? defaultVariant.price / 100 : "") : "",
              compareAtPrice: defaultVariant && defaultVariant.compareAtPrice ? defaultVariant.compareAtPrice / 100 : undefined,
              costPerItem: defaultVariant && defaultVariant.costPerItem !== undefined && defaultVariant.costPerItem !== null ? defaultVariant.costPerItem / 100 : undefined,
              sku: defaultVariant?.sku || undefined,
              barcode: defaultVariant?.barcode || undefined,
              trackQuantity: defaultVariant?.trackInventory,
              continueSellingWhenOutOfStock: defaultVariant?.allowBackorder || false,
              quantity: defaultVariant?.availableQuantity !== undefined ? defaultVariant.availableQuantity : undefined,
              weight: defaultVariant?.weightGrams ? defaultVariant.weightGrams / 1000 : undefined,
              weightUnit: "kg",
              countryOfOrigin: defaultVariant?.countryOfOrigin || undefined,
              hsCode: defaultVariant?.hsCode || undefined,
              collections: p.collections?.map((c: APICollection) => c.name) || [],
              publishingDetails: p.salesChannels?.map((sc: APISalesChannel) => ({
                channel: sc.name,
                published: sc.status === "active",
                date: sc.createdAt,
              })) || [],
              variants: p.variants?.map((v: APIVariant) => ({
                id: v.id,
                name: v.title || "Default",
                sku: v.sku || "",
                price: v.price / 100,
                compareAtPrice: v.compareAtPrice ? v.compareAtPrice / 100 : undefined,
                costPerItem: v.costPerItem !== undefined && v.costPerItem !== null ? v.costPerItem / 100 : undefined,
                prices: v.prices?.map((pr) => ({
                  currencyCode: pr.currencyCode,
                  price: pr.price / 100,
                  compareAtPrice: pr.compareAtPrice ? pr.compareAtPrice / 100 : undefined,
                  costPerItem: pr.costPerItem !== undefined && pr.costPerItem !== null ? pr.costPerItem / 100 : undefined,
                })) || [],
                barcode: v.barcode || undefined,
                trackInventory: v.trackInventory ?? true,
                inventory: v.availableQuantity ?? 0,
                allowBackorder: v.allowBackorder ?? false,
                weightGrams: v.weightGrams ?? undefined,
                countryOfOrigin: v.countryOfOrigin || undefined,
                hsCode: v.hsCode || undefined,
                attributes: v.attributes || {},
                isDefault: v.isDefault ?? false,
              })) || [],
              seo: p.metaTitle || p.metaDescription ? {
                title: p.metaTitle || p.title,
                description: p.metaDescription || "",
              } : undefined,
              currency: p.currency || "USD",
              translations: p.translations || {},
              specifications: p.specifications || {},
              arabicTitle: p.translations?.ar?.name || p.specifications?.arabicName || "",
              arabicDescription: p.translations?.ar?.description || p.specifications?.descriptionArabic || "",
            }
            setProduct(mapped)
            setInitialProduct(JSON.parse(JSON.stringify(mapped)))
            setDescription(mapped.description || "")
          }
        } else {
          console.error("Failed to fetch product details")
          toast.error("Failed to load product details")
        }
      } catch (e) {
        console.error("Failed to load product from API:", e)
        toast.error("Error loading product details")
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadProduct()
    return () => {
      active = false
    }
  }, [id])

  const hasChanges = React.useMemo(() => {
    if (!product || !initialProduct) return false
    const normProduct = { ...product, currency: initialProduct.currency }
    return JSON.stringify(normProduct) !== JSON.stringify(initialProduct)
  }, [product, initialProduct])

  const handleSave = async () => {
    if (!product) return

    // Validate Product Title
    if (!product.title.trim()) {
      toast.error("Product title cannot be empty")
      return
    }

    // Validate Variants
    if (product.variants && product.variants.length > 0) {
      for (let i = 0; i < product.variants.length; i++) {
        const v = product.variants[i]
        
        // Validate Variant Name
        if (!v.name.trim()) {
          toast.error(`Variant #${i + 1} name cannot be empty`)
          return
        }

        // Validate Variant Price
        if (v.price === "" || v.price === undefined || v.price === null) {
          toast.error(`Variant "${v.name}" price cannot be empty`)
          return
        }
        if (isNaN(Number(v.price)) || Number(v.price) < 0) {
          toast.error(`Variant "${v.name}" must have a valid non-negative price`)
          return
        }
      }
    }

    setIsSaving(true)
    try {
      const patchData = {
        title: product.title,
        description: product.description || null,
        status: (product.status.toLowerCase()) as 'draft' | 'active' | 'archived',
        productType: (product.type.toLowerCase()) as 'physical' | 'digital',
        tags: product.tags || [],
        collections: product.collections || [],
        categoryIds: product.categoryIds || [],
        vendorId: product.vendorId === undefined ? undefined : product.vendorId,
        metaTitle: product.seo?.title || null,
        metaDescription: product.seo?.description || null,
        translations: {
          ...(product.translations || {}),
          ar: {
            ...((product.translations?.ar as Record<string, any>) || {}),
            name: product.arabicTitle || "",
            description: product.arabicDescription || "",
          },
        },
        specifications: (() => {
          const specs = { ...(product.specifications || {}) }
          delete specs.arabicName
          delete specs.descriptionArabic
          return specs
        })(),
        variants: product.variants?.map((v, idx) => {
          const currencyPrices = (v.prices && v.prices.length > 0)
            ? v.prices.map((p) => ({
                currencyCode: p.currencyCode,
                price: Math.round(Number(p.price || 0) * 100),
                compareAtPrice: p.compareAtPrice !== undefined && p.compareAtPrice !== null && p.compareAtPrice !== "" ? Math.round(Number(p.compareAtPrice) * 100) : null,
                costPerItem: p.costPerItem !== undefined && p.costPerItem !== null && p.costPerItem !== "" ? Math.round(Number(p.costPerItem) * 100) : null,
              }))
            : undefined

          return {
            id: v.id || undefined,
            sku: v.sku || "AUTO",
            title: v.name,
            price: Math.round(Number(v.price || 0) * 100),
            compareAtPrice: v.compareAtPrice !== undefined && v.compareAtPrice !== null && v.compareAtPrice !== "" ? Math.round(Number(v.compareAtPrice) * 100) : null,
            costPerItem: v.costPerItem !== undefined && v.costPerItem !== null && v.costPerItem !== "" ? Math.round(Number(v.costPerItem) * 100) : null,
            prices: currencyPrices,
            barcode: v.barcode || null,
            trackInventory: v.trackInventory ?? true,
            availableQuantity: v.inventory !== undefined && v.inventory !== "" ? Number(v.inventory) : 0,
            allowBackorder: v.allowBackorder ?? false,
            countryOfOrigin: v.countryOfOrigin || null,
            hsCode: v.hsCode || null,
            weightGrams: v.weightGrams !== undefined && v.weightGrams !== null && v.weightGrams !== "" ? Math.round(Number(v.weightGrams)) : null,
            isDefault: idx === 0,
          }
        }) || []
      }
      
      const res = await apiRequest(`/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patchData)
      })

      if (res.ok) {
        const body = await res.json()
        if (body.data) {
          const p = body.data
          const defaultVariant = p.variants?.find((v: APIVariant) => v.isDefault) || p.variants?.[0]
          const priceFormatted = defaultVariant 
            ? formatPrice(defaultVariant.price, { currency: p.currency || "USD", isMinorUnit: true }) 
            : "-"
          
          const rawStatus = p.status || "draft"
          const capitalizedStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as "Active" | "Draft" | "Archived"
          
          const rawType = p.productType || "physical"
          const capitalizedType = rawType.charAt(0).toUpperCase() + rawType.slice(1)

          const mapped: Product = {
            id: p.id,
            image: p.images?.[0]?.url || "https://placehold.co/300x300?text=No+Image",
            title: p.title,
            description: p.description || "",
            status: capitalizedStatus,
            inventory: defaultVariant?.sku ? `${defaultVariant.sku} (${priceFormatted})` : "No SKU",
            salesChannels: p.salesChannels?.length || 1,
            markets: 1,
            category: p.categories?.[0]?.name || "-",
            categoryIds: p.categories?.map((cat: APICategory) => cat.id) || [],
            type: capitalizedType,
            vendor: p.vendorName || "-",
            vendorId: p.vendorId || null,
            price: defaultVariant ? defaultVariant.price / 100 : 0,
            compareAtPrice: defaultVariant && defaultVariant.compareAtPrice ? defaultVariant.compareAtPrice / 100 : undefined,
            costPerItem: defaultVariant && defaultVariant.costPerItem !== undefined && defaultVariant.costPerItem !== null ? defaultVariant.costPerItem / 100 : undefined,
            sku: defaultVariant?.sku || undefined,
            barcode: defaultVariant?.barcode || undefined,
            trackQuantity: defaultVariant?.trackInventory,
            continueSellingWhenOutOfStock: defaultVariant?.allowBackorder || false,
            quantity: defaultVariant?.availableQuantity !== undefined ? defaultVariant.availableQuantity : undefined,
            weight: defaultVariant?.weightGrams ? defaultVariant.weightGrams / 1000 : undefined,
            weightUnit: "kg",
            countryOfOrigin: defaultVariant?.countryOfOrigin || undefined,
            hsCode: defaultVariant?.hsCode || undefined,
            collections: p.collections?.map((c: APICollection) => c.name) || [],
            publishingDetails: p.salesChannels?.map((sc: APISalesChannel) => ({
              channel: sc.name,
              published: sc.status === "active",
              date: sc.createdAt,
            })) || [],
            variants: p.variants?.map((v: APIVariant) => ({
              id: v.id,
              name: v.title || "Default",
              sku: v.sku || "",
              price: v.price / 100,
              compareAtPrice: v.compareAtPrice ? v.compareAtPrice / 100 : undefined,
              costPerItem: v.costPerItem !== undefined && v.costPerItem !== null ? v.costPerItem / 100 : undefined,
              prices: v.prices?.map((pr) => ({
                currencyCode: pr.currencyCode,
                price: pr.price / 100,
                compareAtPrice: pr.compareAtPrice ? pr.compareAtPrice / 100 : undefined,
                costPerItem: pr.costPerItem !== undefined && pr.costPerItem !== null ? pr.costPerItem / 100 : undefined,
              })) || [],
              barcode: v.barcode || undefined,
              trackInventory: v.trackInventory ?? true,
              inventory: v.availableQuantity ?? 0,
              allowBackorder: v.allowBackorder ?? false,
              weightGrams: v.weightGrams ?? undefined,
              countryOfOrigin: v.countryOfOrigin || undefined,
              hsCode: v.hsCode || undefined,
              attributes: v.attributes || {},
              isDefault: v.isDefault ?? false,
            })) || [],
            seo: p.metaTitle || p.metaDescription ? {
              title: p.metaTitle || p.title,
              description: p.metaDescription || "",
            } : undefined,
            tags: p.tags || [],
            currency: p.currency || "USD",
            translations: p.translations || {},
            specifications: p.specifications || {},
            arabicTitle: p.translations?.ar?.name || p.specifications?.arabicName || "",
            arabicDescription: p.translations?.ar?.description || p.specifications?.descriptionArabic || "",
          }
          setProduct(mapped)
          setInitialProduct(JSON.parse(JSON.stringify(mapped)))
          setDescription(mapped.description || "")
        } else {
          setInitialProduct(JSON.parse(JSON.stringify(product)))
        }
        toast.success("Product saved successfully")
        setShowToast(true)
        setTimeout(() => {
          setShowToast(false)
        }, 3000)
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || "Failed to save product")
      }
    } catch (e) {
      console.error("Failed to save product:", e)
      toast.error("Network error saving product")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    if (!initialProduct) return
    setProduct(JSON.parse(JSON.stringify(initialProduct)))
    setDescription(initialProduct.description || "")
  }

  const handleAddVariant = () => {
    setProduct(prev => {
      if (!prev) return null
      const variants = [...(prev.variants || [])]
      const defaultVariant = variants[0]
      const newVariant: Variant = {
        name: `Variant ${variants.length + 1}`,
        sku: "AUTO",
        price: defaultVariant?.price ?? 0,
        compareAtPrice: defaultVariant?.compareAtPrice,
        costPerItem: defaultVariant?.costPerItem,
        barcode: "",
        trackInventory: defaultVariant?.trackInventory ?? true,
        inventory: 0,
        allowBackorder: defaultVariant?.allowBackorder ?? false,
        weightGrams: defaultVariant?.weightGrams,
        countryOfOrigin: defaultVariant?.countryOfOrigin,
        hsCode: defaultVariant?.hsCode,
        attributes: {},
        isDefault: false
      }
      return {
        ...prev,
        variants: [...variants, newVariant]
      }
    })
  }

  const handleConfirmDeleteVariant = async () => {
    if (variantToDeleteIdx === null || !product || !product.variants) return
    const idx = variantToDeleteIdx
    const variantToDelete = product.variants[idx]
    
    setIsDeleteVariantModalOpen(false)
    setVariantToDeleteIdx(null)

    if (product.variants.length <= 1) {
      toast.error("A product must have at least one variant")
      return
    }

    if (variantToDelete.id) {
      try {
        const res = await apiRequest(`/admin/variants/${variantToDelete.id}`, {
          method: "DELETE"
        })
        if (res.ok) {
          toast.success("Variant deleted successfully")
          setInitialProduct(prev => {
            if (!prev || !prev.variants) return prev
            const variants = prev.variants.filter((v) => v.id !== variantToDelete.id)
            return { ...prev, variants }
          })
          setProduct(prev => {
            if (!prev || !prev.variants) return prev
            const variants = prev.variants.filter((_, i) => i !== idx)
            if (variantToDelete.isDefault && variants[0]) {
              variants[0].isDefault = true
            }
            return { ...prev, variants }
          })
        } else {
          const body = await res.json().catch(() => ({}))
          toast.error(body.error || "Failed to delete variant")
        }
      } catch (err) {
        console.error("Error deleting variant:", err)
        toast.error("Error deleting variant")
      }
    } else {
      setProduct(prev => {
        if (!prev || !prev.variants) return prev
        const variants = prev.variants.filter((_, i) => i !== idx)
        return { ...prev, variants }
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full font-ui min-h-0">
        {/* Top Navigation / Header Skeleton */}
        <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center gap-3.5 shrink-0">
          <div className="size-8 rounded-lg bg-muted/30 animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-6 w-32 bg-muted/30 animate-pulse rounded" />
            <div className="h-5 w-16 bg-muted/20 animate-pulse rounded-full" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-1.5 flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column */}
          <div className="flex-1 w-full flex flex-col gap-6">
            <Card className="animate-pulse w-full">
              <CardContent className="flex flex-col gap-5 py-6">
                <div className="h-4 w-40 bg-muted/30 rounded" />
                <div className="h-20 w-full bg-muted/10 rounded-lg mt-2" />
              </CardContent>
            </Card>
            <Card className="animate-pulse w-full">
              <CardContent className="flex flex-col gap-5 py-6">
                <div className="h-4 w-40 bg-muted/30 rounded" />
                <div className="h-10 w-full bg-muted/10 rounded-lg mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-6">
            <Card className="animate-pulse w-full">
              <CardContent className="flex flex-col gap-5 py-6">
                <div className="h-4 w-28 bg-muted/30 rounded" />
                <div className="h-32 w-full bg-muted/10 rounded-lg" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 font-ui">
        <div className="text-center max-w-sm flex flex-col items-center gap-3">
          <div className="p-3 bg-muted/40 rounded-full">
            <Icon name="inventory_2" className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Product Not Found</h2>
          <p className="text-sm text-muted-foreground leading-normal">
            The product &quot;{id}&quot; could not be found or has been deleted from your store records.
          </p>
          <Link href="/dashboard/products" className="mt-2">
            <Button size="sm" className="cursor-pointer">Back to Products</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isSingleVariant = !product.variants || product.variants.length <= 1
  const hasCompareAtPrice = !isSingleVariant && (product.variants?.some(v => v.compareAtPrice !== undefined && v.compareAtPrice !== "") || false)
  const hasInventoryDetails = isSingleVariant && (product.sku || product.barcode || product.trackQuantity !== undefined || product.quantity !== undefined)
  const hasShipping = isSingleVariant && (product.weight !== undefined || product.countryOfOrigin || product.hsCode)
  const hasPricing = isSingleVariant && product.price !== undefined
  const hasOrganization = product.vendor || product.category || product.type || (product.tags && product.tags.length > 0) || (product.collections && product.collections.length > 0)
  const hasPublishing = product.publishingDetails && product.publishingDetails.length > 0

  const numericPrice = Number(product.price || 0)
  const numericCost = Number(product.costPerItem || 0)
  const profit = numericCost ? numericPrice - numericCost : 0
  const margin = numericCost && numericPrice > 0 ? ((numericPrice - numericCost) / numericPrice) * 100 : 0
  const currencySymbol = formatPrice(0, { currency: product.currency }).replace(/[0-9.,\s]/g, "")

  return (
    <div className="flex flex-col h-full font-ui min-h-0">
      {/* Top Navigation / Header */}
      <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard/products"
            className="text-muted-foreground hover:text-foreground duration-200 flex items-center justify-center size-8 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <Icon name="arrow_back" className="size-5 text-[20px]" />
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-heading text-foreground tracking-tight leading-none">{product.title}</h2>
            <StatusBadge status={product.status} />
          </div>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      {/* Main Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-1.5 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column */}
        <div className="flex-1 w-full flex flex-col gap-6">
          
          {/* General Info Card */}
          <GeneralInfoCard
            product={product}
            setProduct={setProduct}
            description={description}
            setDescription={setDescription}
            isGeneratingDesc={isGeneratingDesc}
            setIsGeneratingDesc={setIsGeneratingDesc}
            isUploadingImage={isUploadingImage}
            handleImageUpload={handleImageUpload}
            handleMakePrimary={handleMakePrimary}
            handleDeleteImage={handleDeleteImage}
            setIsGalleryModalOpen={setIsGalleryModalOpen}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Pricing Card */}
          {hasPricing && (
            <PricingCard
              product={product}
              setProduct={setProduct}
              currencySymbol={currencySymbol}
              profit={profit}
              margin={margin}
            />
          )}

          {/* Inventory / SKU Card */}
          {hasInventoryDetails && (
            <InventoryCard
              product={product}
              setProduct={setProduct}
            />
          )}

          {/* Shipping Card */}
          {hasShipping && (
            <ShippingCard
              product={product}
              setProduct={setProduct}
            />
          )}

          {/* Variants Card */}
          <VariantsCard
            product={product}
            setProduct={setProduct}
            isSingleVariant={isSingleVariant}
            hasCompareAtPrice={hasCompareAtPrice}
            currencySymbol={currencySymbol}
            handleAddVariant={handleAddVariant}
            toggleExpandVariant={toggleExpandVariant}
            expandedVariantIdxs={expandedVariantIdxs}
            setVariantImageSelectorIdx={setVariantImageSelectorIdx}
            setVariantToDeleteIdx={setVariantToDeleteIdx}
            setIsDeleteVariantModalOpen={setIsDeleteVariantModalOpen}
          />

          {/* Search engine listing */}
          <SEOCard
            product={product}
            setProduct={setProduct}
            isEditingSEO={isEditingSEO}
            setIsEditingSEO={setIsEditingSEO}
          />

          {/* Delete Product Section */}
          <div className="flex justify-between items-center py-5 border-t border-border/80 mt-2">
            <div className="flex flex-col gap-0.5 select-none">
              <span className="text-sm font-semibold text-foreground">Delete this product</span>
              <span className="text-xs text-muted-foreground">This action is permanent and cannot be undone.</span>
            </div>
            <Button
              variant="outline"
              className="h-8 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20 shadow-xs cursor-pointer font-medium"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Delete product
            </Button>
          </div>

        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
          
          {/* Status Card */}
          <StatusCard
            product={product}
            setProduct={setProduct}
          />

          {/* Publishing Card */}
          {hasPublishing && (
            <PublishingCard
              product={product}
            />
          )}

          {/* Category Card */}
          <CategoryCard
            product={product}
            setProduct={setProduct}
            activeTab={activeTab}
          />

          {/* Organization Card */}
          {hasOrganization && (
            <OrganizationCard
              product={product}
              setProduct={setProduct}
            />
          )}

        </div>
      </div>

      {/* Sticky Bottom Save/Discard Bar */}
      <div 
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 px-5 py-3 rounded-xl shadow-xl border border-border/80 backdrop-blur-md flex items-center gap-6 transition-all duration-300 ${
          hasChanges 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-8 pointer-events-none"
        }`}
      >
        <div className="flex flex-col gap-0.5 select-none">
          <span className="text-xs font-semibold text-foreground">Unsaved changes</span>
          <span className="text-[11px] text-muted-foreground">You have unsaved changes on this product.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs cursor-pointer px-3"
            onClick={handleDiscard}
            disabled={isSaving}
          >
            Discard
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer px-4 inline-flex items-center gap-1.5"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span>Saving...</span>
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <Icon name="check_circle" className="size-4" />
          <span className="text-sm font-medium">Product saved successfully</span>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product ?"
        description="Are you sure you want to delete this product? This action is permanent and cannot be undone."
        itemsList={product?.title ? [product.title] : []}
        confirmText="Delete"
      />

      <ConfirmationModal
        isOpen={isDeleteVariantModalOpen}
        onClose={() => {
          setIsDeleteVariantModalOpen(false)
          setVariantToDeleteIdx(null)
        }}
        onConfirm={handleConfirmDeleteVariant}
        title="Delete Variant ?"
        description="Are you sure you want to delete this variant? This action is permanent and cannot be undone."
        itemsList={
          variantToDeleteIdx !== null && product?.variants?.[variantToDeleteIdx]
            ? [product.variants[variantToDeleteIdx].name || `Variant ${variantToDeleteIdx + 1}`]
            : []
        }
        confirmText="Delete"
      />

      {variantImageSelectorIdx !== null && (
        <VariantImageSelectorModal
          isOpen={true}
          onClose={() => setVariantImageSelectorIdx(null)}
          onSelect={handleSelectVariantImage}
          images={product?.images || []}
          currentVariant={
            product?.variants ? product.variants[variantImageSelectorIdx] : undefined
          }
          productId={id}
          onUploadSuccess={(newImg) => {
            setProduct(prev => {
              if (!prev) return null
              const updatedImages = [...(prev.images || []), newImg].sort((a, b) => a.position - b.position)
              return {
                ...prev,
                images: updatedImages,
                image: updatedImages[0]?.url || prev.image,
              }
            })
          }}
        />
      )}

      {isGalleryModalOpen && (
        <MediaGalleryModal
          isOpen={true}
          onClose={() => setIsGalleryModalOpen(false)}
          onSelect={async (asset) => {
            if (!product) return
            try {
              const nextPosition = product.images?.length || 0
              const res = await apiRequest(`/admin/products/${id}/images`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ mediaId: asset.id, position: nextPosition }),
              })

              if (res.ok) {
                const body = await res.json()
                if (body.data) {
                  const newImg: ProductImage = {
                    id: body.data.id,
                    url: body.data.url,
                    variantId: body.data.variantId || null,
                    position: body.data.position || 0,
                    altText: body.data.altText || null,
                  }
                  setProduct(prev => {
                    if (!prev) return null
                    const updatedImages = [...(prev.images || []), newImg].sort((a, b) => a.position - b.position)
                    return {
                      ...prev,
                      images: updatedImages,
                      image: updatedImages[0]?.url || prev.image,
                    }
                  })
                  toast.success("Image added from gallery")
                } else {
                  toast.error("Failed to link image to product")
                }
              } else {
                toast.error("Failed to link image to product")
              }
            } catch (err) {
              console.error("Error adding image from gallery:", err)
              toast.error("Error adding image")
            }
          }}
          productImages={product?.images || []}
        />
      )}
    </div>
  )
}
