"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PageItem {
  id: string
  title: string
  slug: string
  sectionsCount: number
  sections: string[]
  status: "Live" | "Draft" | "Scheduled"
  updatedAt: string
  themeName: string
  editorUrl: string
  previewUrl: string
}

const mockPages: PageItem[] = [
  {
    id: "home",
    title: "Storefront Home Page",
    slug: "/",
    sectionsCount: 5,
    sections: ["Announcement Bar", "Hero (Split Layout)", "Category Image Grid", "Featured Products Carousel", "Rich Text Story"],
    status: "Live",
    updatedAt: "10 mins ago",
    themeName: "Lumière Default",
    editorUrl: "http://localhost:3002/preview/lumiere-parfums?token=preview-token",
    previewUrl: "http://localhost:3001/lumiere-parfums",
  },
  {
    id: "product-template",
    title: "Product Detail Template",
    slug: "/product/[slug]",
    sectionsCount: 3,
    sections: ["Product Media Gallery & Buy Box", "Customer Reviews & Ratings", "Related Gear Recommendations"],
    status: "Live",
    updatedAt: "1 hour ago",
    themeName: "Lumière Default",
    editorUrl: "http://localhost:3002/preview/lumiere-parfums?token=preview-token",
    previewUrl: "http://localhost:3001/lumiere-parfums/product/le-labo-santal-33",
  },
  {
    id: "collections",
    title: "Collections & Catalog Page",
    slug: "/collections",
    sectionsCount: 2,
    sections: ["Category Hero Banner", "Filtered Products Grid"],
    status: "Live",
    updatedAt: "Yesterday",
    themeName: "Lumière Default",
    editorUrl: "http://localhost:3002/preview/lumiere-parfums?token=preview-token",
    previewUrl: "http://localhost:3001/lumiere-parfums/#fragrances",
  },
  {
    id: "about",
    title: "Our Philosophy & Story",
    slug: "/about",
    sectionsCount: 2,
    sections: ["Editorial Rich Text", "Master Perfumers Testimonials"],
    status: "Draft",
    updatedAt: "2 days ago",
    themeName: "Lumière Default",
    editorUrl: "http://localhost:3002/preview/lumiere-parfums?token=preview-token",
    previewUrl: "http://localhost:3001/lumiere-parfums/#about",
  },
]

export function PagesView() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Storefront Pages & CMS</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
              Low-Token AI Active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your e-commerce pages, configure dynamic section layouts, and personalize themes visually or with surgical AI prompts.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            onClick={() => window.open("http://localhost:3002/preview/lumiere-parfums?token=preview-token", "_blank")}
          >
            <Icon name="auto_awesome" className="size-4" />
            Launch AI Visual Editor
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store Pages</CardTitle>
            <Icon name="web" className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4 Pages</div>
            <p className="text-xs text-muted-foreground mt-1">3 Published &bull; 1 Draft</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Sections</CardTitle>
            <Icon name="layers" className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 Sections</div>
            <p className="text-xs text-muted-foreground mt-1">Hero, Promo, Grid, Blog</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Theme</CardTitle>
            <Icon name="palette" className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Lumière Default</div>
            <p className="text-xs text-muted-foreground mt-1">Custom CSS variables</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Efficiency Mode</CardTitle>
            <Icon name="bolt" className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Zero-Token Direct</div>
            <p className="text-xs text-muted-foreground mt-1">WYSIWYG inline edits</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Token UX Strategy Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border bg-gradient-to-br from-blue-500/5 to-transparent flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
            <Icon name="touch_app" className="size-4" />
            1. Zero-Token Visual WYSIWYG
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Click directly on text, buttons, or images on the live preview frame. Edits save locally to component state instantly without triggering any LLM API costs.
          </p>
        </div>

        <div className="p-5 rounded-xl border bg-gradient-to-br from-purple-500/5 to-transparent flex flex-col gap-2">
          <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm">
            <Icon name="swap_calls" className="size-4" />
            2. Drag &amp; Drop Section Palette
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Re-order sections (`Hero`, `Announcement`, `Category Grid`, `Featured Products`) visually. Add pre-built templates deterministically without writing prompts.
          </p>
        </div>

        <div className="p-5 rounded-xl border bg-gradient-to-br from-amber-500/5 to-transparent flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
            <Icon name="psychology" className="size-4" />
            3. Surgical AI Assistant
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use AI prompts only when writing complex copy or generating custom themes. Only the target section payload is sent to the LLM to keep token usage strictly minimal.
          </p>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">E-Commerce Pages</h2>
          <Button variant="outline" size="sm" className="gap-2">
            <Icon name="add" className="size-4" />
            Create Custom Page
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockPages.map((page) => (
            <Card key={page.id} className="shadow-xs hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">{page.title}</CardTitle>
                    <Badge variant={page.status === "Live" ? "default" : "secondary"}>
                      {page.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono">{page.slug}</CardDescription>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <Icon name="article" className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {/* Section Pills */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Layout Sections ({page.sectionsCount}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {page.sections.map((sec, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground border"
                      >
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t pt-3 mt-1 text-xs text-muted-foreground">
                  <span>Updated {page.updatedAt}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs h-8"
                      onClick={() => window.open(page.previewUrl, "_blank")}
                    >
                      <Icon name="open_in_new" className="size-3.5" />
                      View Live
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1 text-xs h-8"
                      onClick={() => window.open(page.editorUrl, "_blank")}
                    >
                      <Icon name="edit" className="size-3.5" />
                      Edit Page
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
