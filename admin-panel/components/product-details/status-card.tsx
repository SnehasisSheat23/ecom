"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Product } from "./types"

interface StatusCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
}

export function StatusCard({
  product,
  setProduct,
}: StatusCardProps) {
  return (
    <Card className="gap-0">
      <CardHeader className="pb-2.5 border-b border-border/60">
        <CardTitle className="text-base font-semibold font-heading text-foreground">Status</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-3 flex flex-col gap-3">
        <Select
          value={product.status}
          onValueChange={(val) => {
            setProduct(prev => prev ? { ...prev, status: val as "Active" | "Draft" | "Archived" } : null)
          }}
        >
          <SelectTrigger className="w-full h-9 justify-between flex">
            <SelectValue>{product.status}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl p-1.5 min-w-[280px]">
            <SelectItem value="Active" className="rounded-lg py-2">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="font-semibold text-sm">Active</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Sell via selected sales channels and markets
                </span>
              </div>
            </SelectItem>
            <SelectItem value="Draft" className="rounded-lg py-2">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="font-semibold text-sm">Draft</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Not visible on selected sales channels or markets
                </span>
              </div>
            </SelectItem>
            <SelectItem value="Archived" className="rounded-lg py-2">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="font-semibold text-sm">Archived</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Archived products cannot be sold and won&apos;t appear in collections
                </span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          This product will be hidden from all sales channels.
        </div>
      </CardContent>
    </Card>
  )
}
