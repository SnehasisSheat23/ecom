"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Product, APIVendor } from "./types"
import { apiRequest } from "@/lib/api-client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface OrganizationCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
}

export function OrganizationCard({
  product,
  setProduct,
}: OrganizationCardProps) {
  const [vendors, setVendors] = React.useState<APIVendor[]>([])

  React.useEffect(() => {
    let active = true
    async function loadVendors() {
      try {
        const res = await apiRequest("/admin/vendors?perPage=100")
        if (res.ok) {
          const body = await res.json()
          if (active && body.data?.items) {
            setVendors(body.data.items)
          }
        }
      } catch (err) {
        console.error("Failed to fetch vendors:", err)
      }
    }
    loadVendors()
    return () => {
      active = false
    }
  }, [])

  return (
    <Card className="gap-0">
      <CardHeader className="pb-2.5 border-b border-border/60">
        <CardTitle className="text-base font-semibold font-heading text-foreground">Organization</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-3 flex flex-col gap-3 text-sm">
        
        {product.type && (
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">Product type</label>
            <Select
              value={product.type}
              onValueChange={(val) => {
                setProduct(prev => prev ? { ...prev, type: val } : null)
              }}
            >
              <SelectTrigger className="w-full h-9 justify-between flex">
                <SelectValue>{product.type}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl p-1.5 min-w-[200px]">
                <SelectItem value="Physical" className="rounded-lg py-1.5">Physical</SelectItem>
                <SelectItem value="Digital" className="rounded-lg py-1.5">Digital</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-foreground">Vendor</label>
          <Select
            value={product.vendorId || "platform"}
            onValueChange={(val) => {
              if (val === "platform") {
                setProduct(prev => prev ? { ...prev, vendorId: null, vendor: "-" } : null)
              } else {
                const selectedVendor = vendors.find(v => v.id === val)
                setProduct(prev => prev ? { ...prev, vendorId: val, vendor: selectedVendor?.name || "Unknown Vendor" } : null)
              }
            }}
          >
            <SelectTrigger className="w-full h-9 justify-between flex">
              <SelectValue>
                {product.vendorId
                  ? (vendors.find(v => v.id === product.vendorId)?.name || product.vendor || "Unknown Vendor")
                  : (product.vendor || "-")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl p-1.5 min-w-[200px]">
              <SelectItem value="platform" className="rounded-lg py-1.5">Direct / Platform Store</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id} className="rounded-lg py-1.5">
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
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
        )}
      </CardContent>
    </Card>
  )
}
