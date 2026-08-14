"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { cn } from "@/lib/utils"
import { Product } from "./types"

interface GeneralInfoCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
  description: string
  setDescription: (desc: string) => void
  isGeneratingDesc: boolean
  setIsGeneratingDesc: (val: boolean) => void
  isUploadingImage: boolean
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handleMakePrimary: (imageId: string) => Promise<void>
  handleDeleteImage: (imageId: string) => Promise<void>
  setIsGalleryModalOpen: (open: boolean) => void
  activeTab?: 'en' | 'ar'
  setActiveTab?: (tab: 'en' | 'ar') => void
}

export function GeneralInfoCard({
  product,
  setProduct,
  description,
  setDescription,
  isGeneratingDesc,
  setIsGeneratingDesc,
  isUploadingImage,
  handleImageUpload,
  handleMakePrimary,
  handleDeleteImage,
  setIsGalleryModalOpen,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
}: GeneralInfoCardProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [internalActiveTab, setInternalActiveTab] = React.useState<'en' | 'ar'>('en')

  const activeTab = externalActiveTab ?? internalActiveTab
  const setActiveTab = externalSetActiveTab ?? setInternalActiveTab

  const handleAutoTranslate = () => {
    setIsGeneratingDesc(true)
    setTimeout(() => {
      const title = product?.title || ""
      let autoArTitle = "كاتشب طماطم فاخر مظاريف"
      if (title.toLowerCase().includes("vinegar")) autoArTitle = "خل أبيض طبيعي فاخر"
      else if (title.toLowerCase().includes("pickle")) autoArTitle = "مخلل خضار مشكل فاخر"
      else if (title.toLowerCase().includes("olive")) autoArTitle = "زيت زيتون بكر ممتاز"
      else if (title.toLowerCase().includes("fries")) autoArTitle = "بطاطس مقلية ممتازة"
      else if (title.toLowerCase().includes("sauce") || title.toLowerCase().includes("barbecue")) autoArTitle = "صلصة باربيكيو فاخرة"
      
      const autoArDesc = `<p dir="rtl">منتج عالي الجودة مصمم خصيصاً للمطاعم والفنادق وشركات الإعاشة بالمملكة العربية السعودية.</p><ul><li dir="rtl">جودة ممتازة ومعايير قياسية</li><li dir="rtl">تغليف آمن ومناسب للتخزين</li></ul>`

      setProduct(prev => prev ? {
        ...prev,
        arabicTitle: autoArTitle,
        arabicDescription: autoArDesc,
        translations: {
          ...(prev.translations || {}),
          ar: {
            ...((prev.translations?.ar as Record<string, any>) || {}),
            name: autoArTitle,
            description: autoArDesc
          }
        }
      } : null)
      setActiveTab('ar')
      setIsGeneratingDesc(false)
    }, 1000)
  }

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col gap-4">

        {/* Language Switcher Tab Bar */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-1">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab('en')}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-transparent select-none",
                activeTab === 'en'
                  ? "bg-background text-foreground shadow-xs border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ar')}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-transparent select-none relative",
                activeTab === 'ar'
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              العربية (Arabic)
              <span 
                className={cn(
                  "size-1.5 rounded-full bg-emerald-500 transition-opacity",
                  (product?.arabicTitle || product?.specifications?.arabicName) ? "opacity-100" : "opacity-0 invisible"
                )} 
              />
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 gap-1.5 cursor-pointer"
            disabled={isGeneratingDesc}
            onClick={handleAutoTranslate}
          >
            <svg className="size-3.5 text-emerald-600 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
            </svg>
            {isGeneratingDesc ? "Translating..." : "Auto-Translate to Arabic"}
          </Button>
        </div>

        {/* Content Container (Fixed structure prevents tab switch layout jitter) */}
        <div className="relative min-h-[280px]">
          {/* Tab 1: English Content */}
          <div className={cn("flex flex-col gap-4 transition-opacity duration-150", activeTab !== 'en' && "hidden")}>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-foreground">Title</label>
              <input
                type="text"
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={product.title}
                onChange={(e) => setProduct(prev => prev ? { ...prev, title: e.target.value } : null)}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-foreground">Description</label>
              <RichTextEditor 
                value={description} 
                onChange={(val) => {
                  setDescription(val)
                  setProduct(prev => prev ? { ...prev, description: val } : null)
                }}
                onGenerateAI={() => {
                  setIsGeneratingDesc(true)
                  setTimeout(() => {
                    const newDesc = "<p>This magical <strong>AI-generated description</strong> highlights the best features of this product!</p>"
                    setDescription(newDesc)
                    setProduct(prev => prev ? { ...prev, description: newDesc } : null)
                    setIsGeneratingDesc(false)
                  }, 1500)
                }}
                isGenerating={isGeneratingDesc}
              />
            </div>
          </div>

          {/* Tab 2: Arabic Content */}
          <div className={cn("flex flex-col gap-4 transition-opacity duration-150", activeTab !== 'ar' && "hidden")} dir="rtl">
            <div className="flex flex-col gap-2 text-right">
              <label className="text-[13px] font-medium text-foreground">Title (Arabic) / العنوان بالعربية</label>
              <input
                type="text"
                dir="rtl"
                placeholder="مثال: صلصة باربيكيو فاخرة"
                className="w-full h-9 px-3.5 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 font-arabic text-right leading-relaxed"
                value={product?.arabicTitle || product?.translations?.ar?.name || product?.specifications?.arabicName || ""}
                onChange={(e) => {
                  const val = e.target.value
                  setProduct(prev => prev ? {
                    ...prev,
                    arabicTitle: val,
                    translations: {
                      ...(prev.translations || {}),
                      ar: {
                        ...((prev.translations?.ar as Record<string, any>) || {}),
                        name: val
                      }
                    }
                  } : null)
                }}
              />
            </div>

            <div className="flex flex-col gap-2 text-right">
              <label className="text-[13px] font-medium text-foreground">Description (Arabic) / الوصف بالعربية</label>
              <div className="w-full rounded-md text-right font-arabic">
                <RichTextEditor
                  dir="rtl"
                  value={product?.arabicDescription || product?.translations?.ar?.description || product?.specifications?.descriptionArabic || ""}
                  onChange={(val) => {
                    setProduct(prev => prev ? {
                      ...prev,
                      arabicDescription: val,
                      translations: {
                        ...(prev.translations || {}),
                        ar: {
                          ...((prev.translations?.ar as Record<string, any>) || {}),
                          description: val
                        }
                      }
                    } : null)
                  }}
                  onGenerateAI={handleAutoTranslate}
                  isGenerating={isGeneratingDesc}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-4">
          <label className="text-[13px] font-medium text-foreground">Media</label>
          <div className="flex flex-wrap gap-4 items-center">
            {product.images?.map((img: any, idx: number) => {
              const rawUrl = typeof img === "string" ? img : (img?.url || img?.src || "")
              const url = (rawUrl && rawUrl.trim() !== "") ? rawUrl : "https://placehold.co/100x100?text=No+Image"
              const imgId = typeof img === "object" ? (img.id || url || `img-${idx}`) : (img || `img-${idx}`)
              const isPrimary = typeof img === "object" ? img.position === 0 : idx === 0
              const alt = typeof img === "object" ? (img.altText || product.title) : product.title

              return (
                <div key={imgId || `img-${idx}`} className="relative size-24 group rounded-lg overflow-hidden border border-border/60 bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={alt} className="w-full h-full object-cover" />
                  
                  {isPrimary && (
                    <div className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      Primary
                    </div>
                  )}

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute inset-0 bg-black/60 flex items-center justify-center gap-1.5">
                    {!isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-white hover:text-yellow-400 hover:bg-white/10 cursor-pointer"
                        title="Make Primary"
                        onClick={() => handleMakePrimary(imgId)}
                      >
                        <Icon name="star" className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-white hover:text-red-400 hover:bg-white/10 cursor-pointer"
                      title="Delete Image"
                      onClick={() => handleDeleteImage(imgId)}
                    >
                      <Icon name="delete" className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="flex gap-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-24 w-24 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer flex-shrink-0"
              >
                {isUploadingImage ? (
                  <Icon name="progress_activity" className="size-5 animate-spin" />
                ) : (
                  <>
                    <Icon name="add" className="size-6" />
                    <span className="text-[10px] mt-1 font-medium">Upload</span>
                  </>
                )}
              </div>
              <div 
                onClick={() => {
                  setIsGalleryModalOpen(true)
                }}
                className="h-24 w-24 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer flex-shrink-0"
              >
                <Icon name="photo_library" className="size-6" />
                <span className="text-[10px] mt-1 font-medium">From Gallery</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
