"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Product } from "./types"
import { apiRequest } from "@/lib/api-client"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

interface CategoryTreeNode {
  id: string
  name: string
  parentId?: string | null
  translations?: Record<string, Record<string, any>>
  children?: CategoryTreeNode[]
}

function flattenCategories(nodes: CategoryTreeNode[]): { id: string; name: string; arabicName: string }[] {
  let flat: { id: string; name: string; arabicName: string }[] = []
  for (const node of nodes) {
    flat.push({
      id: node.id,
      name: node.name,
      arabicName: node.translations?.ar?.name || node.name,
    })
    if (node.children && node.children.length > 0) {
      flat = flat.concat(flattenCategories(node.children))
    }
  }
  return flat
}

interface CategoryCardProps {
  product: Product
  setProduct: React.Dispatch<React.SetStateAction<Product | null>>
  activeTab?: 'en' | 'ar'
}

export function CategoryCard({
  product,
  setProduct,
  activeTab = 'en',
}: CategoryCardProps) {
  const [categories, setCategories] = React.useState<{ id: string; name: string; arabicName?: string }[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const isArabic = activeTab === 'ar'
  const getDisplayName = (cat: { name: string; arabicName?: string }) =>
    isArabic ? cat.arabicName || cat.name : cat.name

  React.useEffect(() => {
    async function fetchCategories() {
      setIsLoading(true)
      try {
        const res = await apiRequest("/categories")
        if (res.ok) {
          const body = await res.json()
          if (body.data) {
            const flat = flattenCategories(body.data)
            setCategories(flat)
          }
        }
      } catch (err) {
        console.error("Failed to load categories:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCategories()
  }, [])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleCategory = (id: string, name: string) => {
    setProduct(prev => {
      if (!prev) return null
      const currentIds = prev.categoryIds || []
      const isSelected = currentIds.includes(id)
      
      const newIds = isSelected 
        ? currentIds.filter(x => x !== id)
        : [...currentIds, id]

      const matchedCats = categories.filter(c => newIds.includes(c.id))
      const fallbackName = matchedCats[0]?.name || "-"

      return {
        ...prev,
        category: fallbackName,
        categoryIds: newIds
      }
    })
  }

  const handleRemoveCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProduct(prev => {
      if (!prev) return null
      const currentIds = prev.categoryIds || []
      const newIds = currentIds.filter(x => x !== id)

      const matchedCats = categories.filter(c => newIds.includes(c.id))
      const fallbackName = matchedCats[0]?.name || "-"

      return {
        ...prev,
        category: fallbackName,
        categoryIds: newIds
      }
    })
  }

  const handleCreateCategory = async () => {
    const name = searchQuery.trim()
    if (!name) return

    const confirmCreate = window.confirm(`Do you want to create a new category "${name}"?`)
    if (!confirmCreate) return

    try {
      const res = await apiRequest("/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name })
      })

      if (res.ok) {
        const body = await res.json()
        const newCat = body.data
        if (newCat && newCat.id) {
          toast.success(`Category "${name}" created successfully`)
          setCategories(prev => [...prev, { id: newCat.id, name: newCat.name, arabicName: newCat.translations?.ar?.name || newCat.name }])
          handleToggleCategory(newCat.id, newCat.name)
          setSearchQuery("")
        }
      } else {
        const body = await res.json().catch(() => ({}))
        if (res.status === 403) {
          toast.error("Admin access required to create categories")
        } else {
          toast.error(body.error || "Failed to create category")
        }
      }
    } catch (err) {
      console.error("Error creating category:", err)
      toast.error("Error creating category")
    }
  }

  const selectedCats = categories.filter(cat => product.categoryIds?.includes(cat.id))
  let displayBadges: { id: string; name: string; arabicName?: string }[] = selectedCats
  if (displayBadges.length === 0 && product.category && product.category !== "-") {
    displayBadges = [{ id: "temp", name: product.category, arabicName: product.category }]
  }

  return (
    <Card className="gap-0">
      <CardHeader className="pb-2.5 border-b border-border/60">
        <CardTitle className="text-base font-semibold font-heading text-foreground">Product category</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-3 flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
          <div className="relative">
            <div className="flex items-center gap-2 h-9 px-3 py-2 bg-background border border-border/60 rounded-md focus-within:ring-1 focus-within:ring-ring">
              <Icon name="search" size={16} className="size-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search and add categories..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsOpen(true)}
              />
            </div>

            {isOpen && (
              <div className="w-full bg-background border border-border/60 rounded-md flex flex-col mt-1.5 max-h-48 overflow-y-auto py-1 text-sm animate-in fade-in duration-200">
                {isLoading ? (
                  <div className="px-3 py-2 text-muted-foreground text-xs">Loading categories...</div>
                ) : filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => {
                    const isSelected = product.categoryIds?.includes(cat.id)
                    return (
                      <div
                        key={cat.id}
                        className={cn(
                          "px-3 py-2 hover:bg-muted/50 cursor-pointer flex items-center justify-between transition-colors",
                          isArabic && "text-right font-arabic"
                        )}
                        dir={isArabic ? "rtl" : "ltr"}
                        onClick={() => handleToggleCategory(cat.id, cat.name)}
                      >
                        <span className={isSelected ? "font-medium text-foreground" : "text-muted-foreground"}>
                          {getDisplayName(cat)}
                        </span>
                        {isSelected && <Icon name="check" size={16} className="size-4 text-primary" />}
                      </div>
                    )
                  })
                ) : searchQuery.trim() !== "" ? (
                  <div
                    className="px-3 py-2 hover:bg-muted/50 cursor-pointer flex items-center gap-2 text-primary font-medium transition-colors"
                    onClick={handleCreateCategory}
                  >
                    <Icon name="add" size={16} className="size-4" />
                    <span>Create &quot;{searchQuery.trim()}&quot;</span>
                  </div>
                ) : (
                  <div className="px-3 py-2 text-muted-foreground text-xs">No categories found</div>
                )}
              </div>
            )}
          </div>

          {displayBadges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {displayBadges.map((cat) => (
                <div
                  key={cat.id}
                  className={cn(
                    "bg-muted hover:bg-muted/80 px-3.5 py-1.5 rounded-md text-sm font-medium text-foreground flex items-center gap-2 select-none transition-colors animate-in duration-200",
                    isArabic && "font-arabic"
                  )}
                  dir={isArabic ? "rtl" : "ltr"}
                >
                  {getDisplayName(cat)}
                  {cat.id !== "temp" && (
                    <Icon
                      name="close"
                      size={14}
                      className="size-3.5 text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={(e) => handleRemoveCategory(cat.id, e)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
