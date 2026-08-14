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
  arabicName?: string
  englishName?: string
  parentId?: string | null
  translations?: Record<string, Record<string, any>>
  rawTranslations?: Record<string, Record<string, any>>
  children?: CategoryTreeNode[]
}

function flattenCategories(nodes: CategoryTreeNode[]): { id: string; name: string; arabicName: string }[] {
  let flat: { id: string; name: string; arabicName: string }[] = []
  for (const node of nodes) {
    const rawAr =
      node.arabicName ||
      node.translations?.ar?.name ||
      node.rawTranslations?.ar?.name ||
      node.name
    const rawEn =
      node.englishName ||
      node.translations?.en?.name ||
      node.rawTranslations?.en?.name ||
      node.name

    flat.push({
      id: node.id,
      name: rawEn,
      arabicName: rawAr,
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
  const [categories, setCategories] = React.useState<{ id: string; name: string; arabicName: string }[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const isArabic = activeTab === 'ar'
  const getDisplayName = React.useCallback(
    (cat: { name: string; arabicName?: string }) => {
      if (isArabic) {
        return cat.arabicName && cat.arabicName.trim() !== "" ? cat.arabicName : cat.name
      }
      return cat.name && cat.name.trim() !== "" ? cat.name : cat.arabicName || ""
    },
    [isArabic]
  )

  React.useEffect(() => {
    async function fetchCategories() {
      setIsLoading(true)
      try {
        const res = await apiRequest("/categories")
        if (res.ok) {
          const body = await res.json()
          const rawList = body.data?.items || body.data || []
          if (Array.isArray(rawList)) {
            const flat = flattenCategories(rawList)
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

  const filteredCategories = categories.filter((cat) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      cat.name.toLowerCase().includes(q) ||
      (cat.arabicName && cat.arabicName.toLowerCase().includes(q))
    )
  })

  const handleToggleCategory = (id: string, name: string, arabicName?: string) => {
    setProduct((prev) => {
      if (!prev) return null
      const currentIds = prev.categoryIds || []
      const isSelected = currentIds.includes(id)

      const newIds = isSelected
        ? currentIds.filter((x) => x !== id)
        : [...currentIds, id]

      const matchedCats = categories.filter((c) => newIds.includes(c.id))
      const fallbackEn = matchedCats[0]?.name || "-"
      const fallbackAr = matchedCats[0]?.arabicName || ""

      return {
        ...prev,
        category: fallbackEn,
        categoryEnglish: fallbackEn,
        categoryArabic: fallbackAr,
        categoryIds: newIds,
      }
    })
  }

  const handleRemoveCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProduct((prev) => {
      if (!prev) return null
      const currentIds = prev.categoryIds || []
      const newIds = currentIds.filter((x) => x !== id)

      const matchedCats = categories.filter((c) => newIds.includes(c.id))
      const fallbackEn = matchedCats[0]?.name || "-"
      const fallbackAr = matchedCats[0]?.arabicName || ""

      return {
        ...prev,
        category: fallbackEn,
        categoryEnglish: fallbackEn,
        categoryArabic: fallbackAr,
        categoryIds: newIds,
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
        body: JSON.stringify({ name }),
      })

      if (res.ok) {
        const body = await res.json()
        const newCat = body.data
        if (newCat && newCat.id) {
          toast.success(`Category "${name}" created successfully`)
          const catObj = {
            id: newCat.id,
            name: newCat.name,
            arabicName: newCat.arabicName || newCat.translations?.ar?.name || newCat.name,
          }
          setCategories((prev) => [...prev, catObj])
          handleToggleCategory(newCat.id, newCat.name, catObj.arabicName)
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

  const selectedCats = categories.filter((cat) => product.categoryIds?.includes(cat.id))
  let displayBadges: { id: string; name: string; arabicName?: string }[] = selectedCats
  if (displayBadges.length === 0 && product.category && product.category !== "-") {
    const matched = categories.find(
      (c) =>
        c.name.toLowerCase() === product.category.toLowerCase() ||
        (c.arabicName && c.arabicName.toLowerCase() === product.category.toLowerCase())
    )
    if (matched) {
      displayBadges = [matched]
    } else {
      displayBadges = [
        {
          id: "temp",
          name: product.categoryEnglish || product.category,
          arabicName: product.categoryArabic || product.category,
        },
      ]
    }
  }

  return (
    <Card className="gap-0">
      <CardHeader className="pb-2.5 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold font-heading text-foreground">
          {isArabic ? "فئة المنتج (Category)" : "Product category"}
        </CardTitle>
        {isArabic && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold font-arabic">
            بالعربية
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-3 pb-3 flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
          <div className="relative">
            <div className="flex items-center gap-2 h-9 px-3 py-2 bg-background border border-border/60 rounded-md focus-within:ring-1 focus-within:ring-ring">
              <Icon name="search" size={16} className="size-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder={isArabic ? "ابحث عن فئة أو أضفها..." : "Search and add categories..."}
                dir={isArabic ? "rtl" : "ltr"}
                className={cn(
                  "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60",
                  isArabic && "text-right font-arabic"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsOpen(true)}
              />
            </div>

            {isOpen && (
              <div className="w-full bg-background border border-border/60 rounded-md flex flex-col mt-1.5 max-h-48 overflow-y-auto py-1 text-sm animate-in fade-in duration-200 shadow-lg z-20">
                {isLoading ? (
                  <div className="px-3 py-2 text-muted-foreground text-xs">
                    {isArabic ? "جارٍ تحميل الفئات..." : "Loading categories..."}
                  </div>
                ) : filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => {
                    const isSelected = product.categoryIds?.includes(cat.id)
                    const label = getDisplayName(cat)
                    return (
                      <div
                        key={cat.id}
                        className={cn(
                          "px-3 py-2 hover:bg-muted/50 cursor-pointer flex items-center justify-between transition-colors",
                          isArabic && "text-right font-arabic"
                        )}
                        dir={isArabic ? "rtl" : "ltr"}
                        onClick={() => handleToggleCategory(cat.id, cat.name, cat.arabicName)}
                      >
                        <div className="flex flex-col">
                          <span className={isSelected ? "font-medium text-foreground" : "text-muted-foreground"}>
                            {label}
                          </span>
                          {isArabic && cat.name && cat.name !== label && (
                            <span className="text-[10px] text-muted-foreground/70">{cat.name}</span>
                          )}
                        </div>
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
                    <span>{isArabic ? `إنشاء "${searchQuery.trim()}"` : `Create "${searchQuery.trim()}"`}</span>
                  </div>
                ) : (
                  <div className="px-3 py-2 text-muted-foreground text-xs">
                    {isArabic ? "لم يتم العثور على فئات" : "No categories found"}
                  </div>
                )}
              </div>
            )}
          </div>

          {displayBadges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {displayBadges.map((cat) => {
                const label = getDisplayName(cat)
                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "bg-muted hover:bg-muted/80 px-3.5 py-1.5 rounded-md text-sm font-medium text-foreground flex items-center gap-2 select-none transition-colors animate-in duration-200",
                      isArabic && "font-arabic flex-row-reverse"
                    )}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    <span>{label}</span>
                    {cat.id !== "temp" && (
                      <Icon
                        name="close"
                        size={14}
                        className="size-3.5 text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={(e) => handleRemoveCategory(cat.id, e)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
