"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Product } from "./types"

interface OrganizationCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
}

export function OrganizationCard({
  product,
  setProduct,
}: OrganizationCardProps) {
  if (!product.tags || product.tags.length === 0) {
    return null
  }

  return (
    <Card className="gap-0">
      <CardHeader className="pb-2.5 border-b border-border/60">
        <CardTitle className="text-base font-semibold font-heading text-foreground">Organization</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-3 flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-foreground">Tags</label>
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag, idx) => (
              <div key={idx} className="bg-muted px-2.5 py-1 rounded-md text-xs font-medium text-foreground flex items-center gap-1.5 select-none animate-in duration-200">
                {tag}
                <Icon 
                  name="close" 
                  size={12}
                  className="size-3 text-muted-foreground cursor-pointer hover:text-foreground" 
                  onClick={() => {
                    setProduct(prev => {
                      if (!prev || !prev.tags) return prev
                      return {
                        ...prev,
                        tags: prev.tags.filter((_, i) => i !== idx)
                      }
                    })
                  }}
                />
              </div>
            ))}
            <input
              type="text"
              placeholder="Add tag..."
              className="h-7 px-2.5 py-1 text-xs bg-background border border-dashed border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-24 placeholder:text-muted-foreground/60"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = e.currentTarget.value.trim()
                  if (val) {
                    setProduct(prev => {
                      const tags = prev?.tags || []
                      if (tags.includes(val)) return prev
                      return prev ? { ...prev, tags: [...tags, val] } : null
                    })
                    e.currentTarget.value = ""
                  }
                }
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
