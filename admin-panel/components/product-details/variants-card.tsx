"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Product } from "./types"

const SUGGESTIONS = [
  "Default Title",
  "S", "M", "L", "XL", "2XL", "3XL", "XS",
  "Red", "Blue", "Green", "Black", "White", "Grey",
  "S / Red", "M / Red", "L / Red", "XL / Red",
  "S / Blue", "M / Blue", "L / Blue", "XL / Blue",
  "S / Black", "M / Black", "L / Black", "XL / Black",
  "S / White", "M / White", "L / White", "XL / White"
]

interface VariantsCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
  isSingleVariant: boolean
  hasCompareAtPrice: boolean
  currencySymbol: string
  handleAddVariant: () => void
  toggleExpandVariant: (idx: number) => void
  expandedVariantIdxs: Record<number, boolean>
  setVariantImageSelectorIdx: (idx: number | null) => void
  setVariantToDeleteIdx: (idx: number | null) => void
  setIsDeleteVariantModalOpen: (open: boolean) => void
}

export function VariantsCard({
  product,
  setProduct,
  isSingleVariant,
  hasCompareAtPrice,
  currencySymbol,
  handleAddVariant,
  toggleExpandVariant,
  expandedVariantIdxs,
  setVariantImageSelectorIdx,
  setVariantToDeleteIdx,
  setIsDeleteVariantModalOpen,
}: VariantsCardProps) {
  const [activeSuggestIdx, setActiveSuggestIdx] = React.useState<number | null>(null)
  const [suggestCoords, setSuggestCoords] = React.useState<{ top: number; left: number; width: number } | null>(null)

  return (
    <Card className="gap-0">
      <CardHeader className="pb-2.5 border-b border-border/60 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold font-heading text-foreground">Variants</CardTitle>
        </div>
        {!isSingleVariant && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs text-primary border-primary/20 hover:bg-primary/5 cursor-pointer font-medium"
            onClick={handleAddVariant}
          >
            <Icon name="add" className="size-4 mr-1" /> Add variant
          </Button>
        )}
      </CardHeader>
      <CardContent className={isSingleVariant ? "pt-3 pb-3 text-sm" : "p-0"}>
        {isSingleVariant ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-foreground">Single variant product</span>
              <span className="text-xs text-muted-foreground">This product has only one variant. Add options like size or color to define multiple variants.</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs text-primary border-primary/20 hover:bg-primary/5 cursor-pointer font-medium shrink-0"
              onClick={handleAddVariant}
            >
              <Icon name="add" className="size-4 mr-1" /> Add variant
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[600px]">
              <thead className="bg-muted/30 text-muted-foreground text-xs font-medium border-b border-border/60">
                <tr>
                  <th className="px-4 py-3 font-medium w-16 text-center">Image</th>
                  <th className="px-4 py-3 font-medium">Variant Name</th>
                  <th className="px-4 py-3 font-medium w-32">Price</th>
                  {hasCompareAtPrice && (
                    <th className="px-4 py-3 font-medium w-32">Compare at price</th>
                  )}
                  {product.trackQuantity && (
                    <th className="px-4 py-3 font-medium w-28">Available</th>
                  )}
                  <th className="px-4 py-3 font-medium w-16 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {product.variants!.map((variant, idx) => {
                  const variantImage = product.images?.find((img) => img.variantId === variant.id)
                  const isExpanded = !!expandedVariantIdxs[idx]
                  const currentCurrency = product.currency || "SAR"
                  const priceEntry = variant.prices?.find(
                    (p) => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase()
                  )
                  const displayPrice = priceEntry?.price !== undefined
                    ? priceEntry.price
                    : (product.currency === currentCurrency ? variant.price : "")

                  const displayCompareAt = priceEntry?.compareAtPrice !== undefined
                    ? priceEntry.compareAtPrice
                    : (product.currency === currentCurrency ? variant.compareAtPrice : "")

                  const displayCostPerItem = priceEntry?.costPerItem !== undefined
                    ? priceEntry.costPerItem
                    : (product.currency === currentCurrency ? variant.costPerItem : "")

                  const updateVariantPriceField = (
                    field: "price" | "compareAtPrice" | "costPerItem",
                    val: number | ""
                  ) => {
                    setProduct((prev) => {
                      if (!prev) return null
                      const variants = [...(prev.variants || [])]
                      const targetVar = variants[idx]
                      if (!targetVar) return prev

                      const existingPrices = [...(targetVar.prices || [])]
                      const priceIdx = existingPrices.findIndex(
                        (p) => p.currencyCode.toUpperCase() === currentCurrency.toUpperCase()
                      )

                      const updatedPrices = [...existingPrices]
                      if (priceIdx >= 0) {
                        updatedPrices[priceIdx] = { ...updatedPrices[priceIdx], [field]: val }
                      } else {
                        updatedPrices.push({
                          currencyCode: currentCurrency,
                          price: field === "price" ? val : (displayPrice || ""),
                          compareAtPrice: field === "compareAtPrice" ? val : (displayCompareAt || ""),
                          costPerItem: field === "costPerItem" ? val : (displayCostPerItem || ""),
                        })
                      }

                      const updatedVar = {
                        ...targetVar,
                        [field]: val,
                        prices: updatedPrices,
                      }
                      variants[idx] = updatedVar

                      const newProd = { ...prev, variants }
                      if (idx === 0 && currentCurrency === (prev.currency || "SAR")) {
                        if (field === "price") newProd.price = val
                        if (field === "compareAtPrice") newProd.compareAtPrice = val
                        if (field === "costPerItem") newProd.costPerItem = val
                      }
                      return newProd
                    })
                  }

                  return (
                    <React.Fragment key={idx}>
                      <tr className={cn("hover:bg-muted/5 transition-colors", isExpanded && "bg-muted/5")}>
                        <td className="px-4 py-2.5 text-center">
                          <div 
                            onClick={() => {
                              if (!variant.id) {
                                toast.info("Please save the product first to assign a variant image.")
                                return
                              }
                              setVariantImageSelectorIdx(idx)
                            }}
                            className="w-10 h-10 mx-auto rounded border border-border/60 overflow-hidden flex items-center justify-center text-muted-foreground bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer"
                            title={variant.id ? "Click to assign image" : "Save product to assign image"}
                          >
                            {variantImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={variantImage.url} alt={variant.name} className="w-full h-full object-cover" />
                            ) : (
                              <Icon name="image" size={20} className="text-muted-foreground/60" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full h-8 px-2.5 py-1.5 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                              value={variant.name}
                              onFocus={(e) => {
                                setActiveSuggestIdx(idx)
                                const rect = e.currentTarget.getBoundingClientRect()
                                setSuggestCoords({
                                  top: rect.bottom + window.scrollY,
                                  left: rect.left + window.scrollX,
                                  width: rect.width
                                })
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setActiveSuggestIdx(null)
                                  setSuggestCoords(null)
                                }, 150)
                              }}
                              onChange={(e) => {
                                const val = e.target.value
                                setProduct(prev => {
                                  if (!prev) return null
                                  const variants = [...(prev.variants || [])]
                                  variants[idx] = { ...variants[idx], name: val }
                                  return { ...prev, variants }
                                })
                                const rect = e.currentTarget.getBoundingClientRect()
                                setSuggestCoords({
                                  top: rect.bottom + window.scrollY,
                                  left: rect.left + window.scrollX,
                                  width: rect.width
                                })
                              }}
                            />
                            {activeSuggestIdx === idx && suggestCoords && typeof window !== "undefined" && (() => {
                              const query = variant.name.toLowerCase()
                              const filtered = SUGGESTIONS.filter(s => 
                                s.toLowerCase().includes(query)
                              )
                              if (filtered.length === 0) return null
                              return createPortal(
                                <div 
                                  style={{
                                    position: "absolute",
                                    top: suggestCoords.top,
                                    left: suggestCoords.left,
                                    width: suggestCoords.width,
                                  }}
                                  className="z-[9999] bg-popover text-popover-foreground border border-border/80 rounded-md shadow-lg p-1 mt-1 max-h-48 overflow-y-auto animate-in fade-in-50 duration-75"
                                >
                                  {filtered.map((suggestion) => (
                                    <button
                                      key={suggestion}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        setProduct(prev => {
                                          if (!prev) return null
                                          const variants = [...(prev.variants || [])]
                                          variants[idx] = { ...variants[idx], name: suggestion }
                                          return { ...prev, variants }
                                        })
                                        setActiveSuggestIdx(null)
                                        setSuggestCoords(null)
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors select-none font-normal"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>,
                                document.body
                              )
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-medium">
                          <div className="relative flex items-center min-w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none font-medium">{currencySymbol}</span>
                            <input
                              type="number"
                              step="0.01"
                              style={{ paddingLeft: `${Math.max(1.75, (currencySymbol?.length || 1) * 0.55 + 0.65)}rem` }}
                              className="w-full h-8 px-2.5 py-1.5 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                              placeholder="Price"
                              value={displayPrice === "" ? "" : (displayPrice || "")}
                              onChange={(e) => {
                                const raw = e.target.value
                                const val = raw === "" ? "" : (parseFloat(raw) || 0)
                                updateVariantPriceField("price", val)
                              }}
                            />
                          </div>
                        </td>
                        {hasCompareAtPrice && (
                          <td className="px-4 py-2.5 font-medium">
                            <div className="relative flex items-center min-w-28">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none font-medium">{currencySymbol}</span>
                              <input
                                type="number"
                                step="0.01"
                                style={{ paddingLeft: `${Math.max(1.75, (currencySymbol?.length || 1) * 0.55 + 0.65)}rem` }}
                                className="w-full h-8 px-2.5 py-1.5 text-xs bg-background border border-border/60 rounded-md text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                                placeholder="Compare at"
                                value={displayCompareAt === "" ? "" : (displayCompareAt !== undefined ? displayCompareAt : "")}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const val = raw === "" ? "" : (parseFloat(raw) || 0)
                                  updateVariantPriceField("compareAtPrice", val)
                                }}
                              />
                            </div>
                          </td>
                        )}
                        {product.trackQuantity && (
                          <td className="px-4 py-2.5">
                            <input
                              type="number"
                              className="w-full h-8 px-2.5 py-1.5 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={variant.inventory === "" ? "" : (variant.inventory !== undefined ? variant.inventory : "")}
                              onChange={(e) => {
                                const raw = e.target.value
                                const val = raw === "" ? "" : (parseInt(raw, 10) || 0)
                                setProduct(prev => {
                                  if (!prev) return null
                                  const variants = [...(prev.variants || [])]
                                    variants[idx] = { ...variants[idx], inventory: val }
                                  return { ...prev, variants }
                                })
                              }}
                            />
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                              >
                                <Icon name="more_horiz" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() => toggleExpandVariant(idx)}
                                className="cursor-pointer"
                              >
                                <span>{isExpanded ? "Hide variant details" : "Edit variant details"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => {
                                  if (product.variants && product.variants.length <= 1) {
                                    toast.error("A product must have at least one variant")
                                    return
                                  }
                                  setVariantToDeleteIdx(idx)
                                  setIsDeleteVariantModalOpen(true)
                                }}
                                className="cursor-pointer"
                              >
                                <span>Delete variant</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/15 dark:bg-muted/5 border-t border-b border-border/30">
                          <td colSpan={4 + (hasCompareAtPrice ? 1 : 0) + (product.trackQuantity ? 1 : 0)} className="px-6 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm max-w-4xl">
                              {/* Column 1: Inventory & Identity */}
                              <div className="flex flex-col gap-4">
                                <h4 className="font-semibold text-foreground text-[12px] tracking-wider uppercase text-muted-foreground/80 font-heading">Inventory & Identity</h4>
                                
                                <div className="flex flex-col gap-2">
                                  <label className="text-[13px] font-medium text-foreground">SKU (Stock Keeping Unit)</label>
                                  <input
                                    type="text"
                                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={variant.sku || ""}
                                    placeholder="AUTO"
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setProduct(prev => {
                                        if (!prev) return null
                                        const variants = [...(prev.variants || [])]
                                        variants[idx] = { ...variants[idx], sku: val }
                                        return { ...prev, variants }
                                      })
                                    }}
                                  />
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[13px] font-medium text-foreground">Barcode (ISBN, UPC, GTIN, etc.)</label>
                                  <input
                                    type="text"
                                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={variant.barcode || ""}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setProduct(prev => {
                                        if (!prev) return null
                                        const variants = [...(prev.variants || [])]
                                        variants[idx] = { ...variants[idx], barcode: val }
                                        return { ...prev, variants }
                                      })
                                    }}
                                  />
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[13px] font-medium text-foreground">Compare at price</label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">{currencySymbol}</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full h-9 px-3 py-2 pl-8 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      value={displayCompareAt === "" ? "" : (displayCompareAt !== undefined ? displayCompareAt : "")}
                                      onChange={(e) => {
                                        const raw = e.target.value
                                        const val = raw === "" ? "" : (parseFloat(raw) || 0)
                                        updateVariantPriceField("compareAtPrice", val)
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[13px] font-medium text-foreground">Cost per item</label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">{currencySymbol}</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full h-9 px-3 py-2 pl-8 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      value={displayCostPerItem === "" ? "" : (displayCostPerItem !== undefined ? displayCostPerItem : "")}
                                      onChange={(e) => {
                                        const raw = e.target.value
                                        const val = raw === "" ? "" : (parseFloat(raw) || 0)
                                        updateVariantPriceField("costPerItem", val)
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`trackQuantity-${idx}`}
                                      checked={!!variant.trackInventory}
                                      onCheckedChange={(checked) => {
                                        setProduct(prev => {
                                          if (!prev) return null
                                          const variants = [...(prev.variants || [])]
                                          variants[idx] = { ...variants[idx], trackInventory: !!checked }
                                          return { ...prev, variants }
                                        })
                                      }}
                                    />
                                    <label htmlFor={`trackQuantity-${idx}`} className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                                      Track quantity
                                    </label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`continueSelling-${idx}`}
                                      checked={!!variant.allowBackorder}
                                      onCheckedChange={(checked) => {
                                        setProduct(prev => {
                                          if (!prev) return null
                                          const variants = [...(prev.variants || [])]
                                          variants[idx] = { ...variants[idx], allowBackorder: !!checked }
                                          return { ...prev, variants }
                                        })
                                      }}
                                    />
                                    <label htmlFor={`continueSelling-${idx}`} className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                                      Continue selling when out of stock
                                    </label>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Shipping & Customs */}
                              <div className="flex flex-col gap-4">
                                <h4 className="font-semibold text-foreground text-[12px] tracking-wider uppercase text-muted-foreground/80 font-heading">Shipping & Customs</h4>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[13px] font-medium text-foreground">Weight (kg)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={variant.weightGrams === "" || variant.weightGrams === undefined ? "" : variant.weightGrams / 1000}
                                    onChange={(e) => {
                                      const raw = e.target.value
                                      const val = raw === "" ? "" : (parseFloat(raw) || 0)
                                      setProduct(prev => {
                                        if (!prev) return null
                                        const variants = [...(prev.variants || [])]
                                        variants[idx] = { ...variants[idx], weightGrams: val === "" ? "" : Math.round(val * 1000) }
                                        return { ...prev, variants }
                                      })
                                    }}
                                  />
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[13px] font-medium text-foreground">Country/Region of Origin</label>
                                  <input
                                    type="text"
                                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={variant.countryOfOrigin || ""}
                                    placeholder="Select country"
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setProduct(prev => {
                                        if (!prev) return null
                                        const variants = [...(prev.variants || [])]
                                        variants[idx] = { ...variants[idx], countryOfOrigin: val }
                                        return { ...prev, variants }
                                      })
                                    }}
                                  />
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[13px] font-medium text-foreground">HS (Harmonized System) code</label>
                                  <input
                                    type="text"
                                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={variant.hsCode || ""}
                                    placeholder="e.g. 6109.10"
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setProduct(prev => {
                                        if (!prev) return null
                                        const variants = [...(prev.variants || [])]
                                        variants[idx] = { ...variants[idx], hsCode: val }
                                        return { ...prev, variants }
                                      })
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
