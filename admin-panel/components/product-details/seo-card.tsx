"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Product } from "./types"

interface SEOCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
  isEditingSEO: boolean
  setIsEditingSEO: (val: boolean) => void
}

const stripHtml = (html?: string) => {
  if (!html) return ""
  return html.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim()
}

export function SEOCard({
  product,
  setProduct,
  isEditingSEO,
  setIsEditingSEO,
}: SEOCardProps) {
  const hasSEOData = !!(product.seo?.title?.trim() || product.seo?.description?.trim())

  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || "https://abdullahbakheettksa.com"
  const cleanStoreUrl = storeUrl.replace(/\/$/, "")

  return (
    <Card className="shadow-xs border-border/60">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold font-heading text-foreground">Search engine listing</CardTitle>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary" onClick={() => setIsEditingSEO(!isEditingSEO)}>
          {isEditingSEO ? (hasSEOData ? "Preview" : "Cancel") : "Edit"}
        </Button>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-4">
        {!isEditingSEO ? (
          <div className="flex flex-col gap-1">
            <span className="text-[15px] text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer">
              {product.seo?.title || product.title}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              {cleanStoreUrl}/products/{(product.seo?.title || product.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              {stripHtml(product.seo?.description || product.description) || "Add a description to see how this product might appear in a search engine listing."}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-foreground">Page title</label>
              <input
                type="text"
                className="h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={product.seo?.title || ""}
                onChange={(e) => {
                  const val = e.target.value
                  setProduct(prev => prev ? {
                    ...prev,
                    seo: { ...prev.seo, title: val, description: prev.seo?.description || "" }
                  } : null)
                }}
              />
              <span className="text-xs text-muted-foreground">{(product.seo?.title || "").length} of 70 characters used</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-foreground">Meta description</label>
              <textarea
                className="min-h-24 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={product.seo?.description || ""}
                onChange={(e) => {
                  const val = e.target.value
                  setProduct(prev => prev ? {
                    ...prev,
                    seo: { ...prev.seo, description: val, title: prev.seo?.title || "" }
                  } : null)
                }}
              />
              <span className="text-xs text-muted-foreground">{(product.seo?.description || "").length} of 320 characters used</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-foreground">URL handle</label>
              <div className="flex items-center rounded-md border border-border/60 bg-muted/5 w-full h-9">
                <span className="pl-3 text-muted-foreground text-sm select-none shrink-0">
                  {cleanStoreUrl}/products/
                </span>
                <input
                  type="text"
                  disabled
                  className="px-0.5 py-2 text-sm bg-transparent border-none outline-none focus:outline-none w-full select-none cursor-not-allowed text-muted-foreground min-w-0"
                  value={(product.seo?.title || product.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
