"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Product } from "./types"

interface PublishingCardProps {
  product: Product
}

export function PublishingCard({ product }: PublishingCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold font-heading text-foreground">Publishing</CardTitle>
        <Icon name="more_vert" className="size-4 text-muted-foreground cursor-pointer hover:text-foreground" />
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-4 text-sm">
        <div className="flex font-medium text-[13px] justify-between">
          <span className="text-foreground">Sales channels</span>
          <span className="text-primary hover:underline cursor-pointer">Manage</span>
        </div>
        {product.publishingDetails!.map((detail, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className={`mt-1.5 size-1.5 rounded-full shrink-0 ${detail.published ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground font-medium text-[13px]">{detail.channel}</span>
              {detail.published && detail.date ? (
                <span className="text-[11px] text-muted-foreground">
                  {new Date(detail.date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Not published</span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
