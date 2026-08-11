"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { apiRequest } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface CategoryItem {
  id: string
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  parentId?: string | null
  level?: number
  position?: number
  isActive: boolean
  translations?: Record<string, Record<string, any>>
  arabicName?: string
  arabicDescription?: string
}

export interface BackendCategoryApiItem {
  id: string
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  parentId?: string | null
  level?: number
  sortOrder?: number
  status?: string
  isActive?: boolean
  translations?: Record<string, Record<string, any>>
}

function mapApiToCategoryItem(c: BackendCategoryApiItem, overrideLevel?: number): CategoryItem {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || "",
    imageUrl: c.imageUrl || "",
    parentId: c.parentId || null,
    level: overrideLevel ?? c.level ?? 0,
    position: c.sortOrder ?? 0,
    isActive: c.isActive ?? (c.status === "ACTIVE"),
    translations: c.translations || {},
    arabicName: c.translations?.ar?.name || "",
    arabicDescription: c.translations?.ar?.description || "",
  }
}

const GALLERY_PRESETS = [
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500",
  "https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?w=500",
  "https://images.unsplash.com/photo-1495745966610-2a67f229785e?w=500",
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500",
]

const TABS = ["All", "Active", "Draft"]

function StatusBadge({ isActive }: { isActive: boolean }) {
  let dotColor = "bg-zinc-400"
  let bgColor = "bg-muted/50"
  let textColor = "text-zinc-600 dark:text-zinc-300"
  const label = isActive ? "Active" : "Draft"

  if (isActive) {
    dotColor = "bg-emerald-500"
    bgColor = "bg-emerald-100/80 dark:bg-emerald-900/30"
    textColor = "text-emerald-800 dark:text-emerald-400"
  } else {
    dotColor = "bg-zinc-400"
    bgColor = "bg-zinc-100/80 dark:bg-zinc-800/30"
    textColor = "text-zinc-600 dark:text-zinc-400"
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-[11px] ${bgColor} ${textColor}`}>
      <div className={`size-1.5 rounded-full ${dotColor}`} />
      {label}
    </div>
  )
}

function LevelBadge({ level = 0 }: { level?: number }) {
  let label = "Category"
  if (level === 1) label = "Subcategory"
  if (level >= 2) label = "Sub-subcategory"

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/80 text-muted-foreground border border-border/40">
      {label}
    </span>
  )
}

export function CategoriesView() {
  const [topLevelCategories, setTopLevelCategories] = React.useState<CategoryItem[]>([])
  const [childrenMap, setChildrenMap] = React.useState<Map<string, CategoryItem[]>>(new Map())
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadingParents, setLoadingParents] = React.useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<CategoryItem[] | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)

  const [activeTab, setActiveTab] = React.useState("All")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())

  // Modal Dialog states
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<CategoryItem | null>(null)
  const [formName, setFormName] = React.useState("")
  const [formSlug, setFormSlug] = React.useState("")
  const [formDescription, setFormDescription] = React.useState("")
  const [formArabicName, setFormArabicName] = React.useState("")
  const [formArabicDescription, setFormArabicDescription] = React.useState("")
  const [activeFormTab, setActiveFormTab] = React.useState<'en' | 'ar'>('en')
  const [formImageUrl, setFormImageUrl] = React.useState("")
  const [formParentId, setFormParentId] = React.useState<string>("")
  const [formIsActive, setFormIsActive] = React.useState(true)
  const [isSlugUserModified, setIsSlugUserModified] = React.useState(false)
  const [isGeneratingDesc, setIsGeneratingDesc] = React.useState(false)
  const [showPresetPicker, setShowPresetPicker] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleAutoTranslateCategory = () => {
    if (!formName.trim()) {
      toast.error("Please enter English category name first")
      return
    }
    setIsGeneratingDesc(true)
    setTimeout(() => {
      let autoArName = formName.trim()
      if (formName.toLowerCase().includes("cake")) autoArName = "كيك فاخر"
      else if (formName.toLowerCase().includes("ketchup")) autoArName = "كاتشب طماطم"
      else if (formName.toLowerCase().includes("sauce")) autoArName = "صلصة فاخرة"
      else autoArName = `فئة ${formName.trim()}`

      const autoArDesc = `<p dir="rtl">فئة عالية الجودة تضمن أفضل المنتجات بالمملكة العربية السعودية.</p>`

      setFormArabicName(autoArName)
      setFormArabicDescription(autoArDesc)
      setActiveFormTab('ar')
      setIsGeneratingDesc(false)
      toast.success("Auto-translated category to Arabic")
    }, 800)
  }

  // ── Load Root Top-Level Categories (Level 0) on Mount ────────────────────
  const loadRootCategories = React.useCallback(async () => {
    try {
      const res = await apiRequest("/categories?parentId=null&includeInactive=true")
      if (res.ok) {
        const body = await res.json()
        const items: BackendCategoryApiItem[] = Array.isArray(body.data) ? body.data : body.data?.items ?? []
        setTopLevelCategories(
          items
            .map((c) => mapApiToCategoryItem(c, 0))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      } else {
        toast.error("Failed to fetch categories")
      }
    } catch (err) {
      console.error("Failed to load categories:", err)
      toast.error("Error connecting to server")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const res = await apiRequest("/categories?parentId=null&includeInactive=true")
        if (res.ok && isMounted) {
          const body = await res.json()
          const items: BackendCategoryApiItem[] = Array.isArray(body.data) ? body.data : body.data?.items ?? []
          setTopLevelCategories(
            items
              .map((c) => mapApiToCategoryItem(c, 0))
              .sort((a, b) => a.name.localeCompare(b.name))
          )
        }
      } catch (err) {
        console.error("Failed to load categories:", err)
        if (isMounted) toast.error("Error connecting to server")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [])

  // ── Fetch Subcategories On-Demand when Chevron ▶ is clicked ────────────────
  const handleToggleExpand = async (cat: CategoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    const catId = cat.id
    if (expandedRows.has(catId)) {
      // Collapse
      setExpandedRows((prev) => {
        const next = new Set(prev)
        next.delete(catId)
        return next
      })
      return
    }

    // Check if children are already fetched
    if (childrenMap.has(catId)) {
      setExpandedRows((prev) => new Set(prev).add(catId))
      return
    }

    // On-Demand Lazy Fetch from Backend API
    try {
      setLoadingParents((prev) => new Set(prev).add(catId))
      const res = await apiRequest(`/categories?parentId=${catId}&includeInactive=true`)
      if (res.ok) {
        const body = await res.json()
        const items: BackendCategoryApiItem[] = Array.isArray(body.data) ? body.data : body.data?.items ?? []
        const children: CategoryItem[] = items
          .map((c) => mapApiToCategoryItem(c, (cat.level ?? 0) + 1))
          .sort((a, b) => a.name.localeCompare(b.name))

        setChildrenMap((prev) => new Map(prev).set(catId, children))
        setExpandedRows((prev) => new Set(prev).add(catId))
      } else {
        toast.error("Failed to load subcategories")
      }
    } catch (err) {
      console.error("Error loading subcategories:", err)
      toast.error("Failed to load subcategories")
    } finally {
      setLoadingParents((prev) => {
        const next = new Set(prev)
        next.delete(catId)
        return next
      })
    }
  }

  // ── Search Handler ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      const resetTimer = setTimeout(() => {
        setSearchResults(null)
        setIsSearching(false)
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    let isMounted = true
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true)
        const res = await apiRequest(`/categories?includeInactive=true`)
        if (res.ok && isMounted) {
          const body = await res.json()
          const items: BackendCategoryApiItem[] = Array.isArray(body.data) ? body.data : body.data?.items ?? []
          const q = searchQuery.toLowerCase().trim()
          const matched = items
            .filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
            .map((c) => mapApiToCategoryItem(c))
          setSearchResults(matched)
        }
      } catch (err) {
        console.error("Search error:", err)
      } finally {
        if (isMounted) setIsSearching(false)
      }
    }, 300)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [searchQuery])

  // Live Auto-generate Slug from Name
  const handleNameChange = (val: string) => {
    setFormName(val)
    if (!isSlugUserModified) {
      setFormSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      )
    }
  }

  const handleSlugChange = (val: string) => {
    setFormSlug(val)
    setIsSlugUserModified(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormImageUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const openCreateDialog = () => {
    setEditingCategory(null)
    setFormName("")
    setFormSlug("")
    setFormDescription("")
    setFormArabicName("")
    setFormArabicDescription("")
    setActiveFormTab('en')
    setFormImageUrl("")
    setFormParentId("")
    setFormIsActive(true)
    setIsSlugUserModified(false)
    setShowPresetPicker(false)
    setIsAddOpen(true)
  }

  const openCreateChildDialog = (parentCat: CategoryItem) => {
    setEditingCategory(null)
    setFormName("")
    setFormSlug("")
    setFormDescription("")
    setFormArabicName("")
    setFormArabicDescription("")
    setActiveFormTab('en')
    setFormImageUrl("")
    setFormParentId(parentCat.id)
    setFormIsActive(true)
    setIsSlugUserModified(false)
    setShowPresetPicker(false)
    setIsAddOpen(true)
  }

  const openEditDialog = (category: CategoryItem) => {
    setEditingCategory(category)
    setFormName(category.name)
    setFormSlug(category.slug)
    setFormDescription(category.description || "")
    setFormArabicName(category.arabicName || "")
    setFormArabicDescription(category.arabicDescription || "")
    setActiveFormTab('en')
    setFormImageUrl(category.imageUrl || "")
    setFormParentId(category.parentId || "")
    setFormIsActive(category.isActive)
    setIsSlugUserModified(true)
    setShowPresetPicker(false)
    setIsAddOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Category name is required")
      return
    }

    const finalSlug = formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]+/g, "-")

    try {
      setIsSaving(true)
      const payload = {
        name: formName.trim(),
        slug: finalSlug,
        description: formDescription || null,
        imageUrl: formImageUrl || null,
        parentId: formParentId ? formParentId : null,
        isActive: formIsActive,
        translations: {
          ...(editingCategory?.translations || {}),
          ar: {
            ...((editingCategory?.translations?.ar as Record<string, any>) || {}),
            name: formArabicName.trim(),
            description: formArabicDescription || "",
          },
        },
      }

      if (editingCategory) {
        const res = await apiRequest(`/admin/categories/${editingCategory.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          toast.success("Category updated successfully")
          setIsAddOpen(false)
          const body = await res.json()
          const updatedRaw = body.data ?? body
          const updated = mapApiToCategoryItem(updatedRaw, updatedRaw.level ?? editingCategory.level)

          setTopLevelCategories((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          )
          setChildrenMap((prev) => {
            const next = new Map(prev)
            for (const [key, list] of next.entries()) {
              next.set(
                key,
                list.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
              )
            }
            return next
          })
        } else {
          const errData = await res.json().catch(() => ({}))
          toast.error(errData.message || "Failed to update category")
        }
      } else {
        const res = await apiRequest("/admin/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          toast.success("Category created successfully")
          setIsAddOpen(false)
          const body = await res.json()
          const createdRaw = body.data ?? body
          const created = mapApiToCategoryItem(createdRaw, createdRaw.level)

          if (!created.parentId) {
            setTopLevelCategories((prev) =>
              [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
            )
          } else {
            setChildrenMap((prev) => {
              const next = new Map(prev)
              const list = next.get(created.parentId!) || []
              next.set(
                created.parentId!,
                [...list, created].sort((a, b) => a.name.localeCompare(b.name))
              )
              return next
            })
            setExpandedRows((prev) => new Set(prev).add(created.parentId!))
          }
        } else {
          const errData = await res.json().catch(() => ({}))
          toast.error(errData.message || "Failed to create category")
        }
      }
    } catch (err) {
      console.error("Failed to save category:", err)
      toast.error("Error saving category")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return

    try {
      const res = await apiRequest(`/admin/categories/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Category deleted")
        setSelectedRows((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        setTopLevelCategories((prev) => prev.filter((c) => c.id !== id))
        setChildrenMap((prev) => {
          const next = new Map(prev)
          next.delete(id)
          for (const [key, list] of next.entries()) {
            next.set(
              key,
              list.filter((c) => c.id !== id)
            )
          }
          return next
        })
      } else {
        toast.error("Failed to delete category")
      }
    } catch (err) {
      console.error("Delete category error:", err)
      toast.error("Error deleting category")
    }
  }

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRows)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedRows(next)
  }

  // ── Recursive Row Rendering ───────────────────────────────────────────────
  const renderCategoryRow = (cat: CategoryItem, depth: number = 0) => {
    if (activeTab === "Active" && !cat.isActive) return null
    if (activeTab === "Draft" && cat.isActive) return null

    const catId = cat.id
    const children = childrenMap.get(catId) ?? []
    const isExpanded = expandedRows.has(catId)
    const isFetchingChildren = loadingParents.has(catId)
    const isSelected = selectedRows.has(catId)
    const indentPadding = depth * 24

    return (
      <React.Fragment key={catId}>
        <tr
          onClick={() => openEditDialog(cat)}
          className={`hover:bg-muted/40 transition-colors group cursor-pointer ${
            isSelected ? "bg-muted/30" : depth === 0 ? "bg-card" : depth === 1 ? "bg-muted/10" : "bg-muted/20"
          }`}
        >
          <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelectRow(catId)}
            />
          </td>

          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${indentPadding}px` }}>
              {/* Expand Chevron / On-Demand Loading Spinner */}
              <button
                type="button"
                onClick={(e) => handleToggleExpand(cat, e)}
                disabled={isFetchingChildren}
                className="size-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-transform disabled:opacity-50"
                title={isExpanded ? "Collapse" : "Fetch subcategories"}
              >
                {isFetchingChildren ? (
                  <div className="size-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                ) : (
                  <Icon
                    name={isExpanded ? "expand_more" : "chevron_right"}
                    size={16}
                    className="size-4!"
                  />
                )}
              </button>

              {/* Cover Image */}
              {cat.imageUrl ? (
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="size-7 rounded object-cover border border-border/80 bg-muted shrink-0"
                />
              ) : (
                <div className="size-7 rounded border border-border/80 bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                  <Icon name="category" size={14} className="size-3.5 opacity-60" />
                </div>
              )}

              {/* Title & Badge */}
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-medium ${depth === 0 ? "text-sm text-foreground font-semibold" : depth === 1 ? "text-xs text-foreground font-medium" : "text-xs text-muted-foreground"}`}>
                  {cat.name}
                </span>

                {children.length > 0 && (
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full shrink-0">
                    {children.length} items loaded
                  </span>
                )}
              </div>
            </div>
          </td>

          <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
            /{cat.slug}
          </td>

          <td className="px-3 py-2.5">
            <LevelBadge level={cat.level} />
          </td>

          <td className="px-3 py-2.5">
            <StatusBadge isActive={cat.isActive} />
          </td>

          <td className="px-3 py-2.5 text-right pr-4" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Icon name="more_horiz" size={16} className="size-4!" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 font-ui p-1.5">
                <DropdownMenuItem onClick={() => openCreateChildDialog(cat)} className="cursor-pointer">
                  <Icon name="add" size={16} className="size-4 text-muted-foreground" />
                  <span>Add subcategory</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditDialog(cat)} className="cursor-pointer">
                  <Icon name="edit" size={16} className="size-4 text-muted-foreground" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(cat.id)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Icon name="delete" size={16} className="size-4 text-destructive" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>

        {/* Render Children On-Demand when Expanded */}
        {isExpanded && children.map((child) => renderCategoryRow(child, depth + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage product taxonomy ({topLevelCategories.length} categories, on-demand subcategories)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} size="sm" className="h-8 gap-1.5 text-xs font-medium cursor-pointer">
            <Icon name="add" size={16} className="size-4!" />
            <span>Add category</span>
          </Button>
        </div>
      </div>

      {/* Categories Table Container */}
      <div className="border border-border/80 rounded-lg overflow-hidden bg-card/40 shadow-xs flex flex-col flex-1 min-h-0 mt-2">
        {/* Toolbar & Filters */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-2 h-12 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-fade-right flex-1 min-w-0 pr-4">
            {TABS.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                className={`h-8 rounded-md text-xs font-medium px-3 transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab
                    ? "bg-muted text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Button>
            ))}

            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-transparent cursor-pointer shrink-0 font-medium ml-1 gap-1"
                onClick={() => setSearchQuery("")}
              >
                <Icon name="close" size={14} className="size-3.5!" /> Clear filters
              </Button>
            )}
          </div>

          {selectedRows.size > 0 ? (
            <div className="flex items-center gap-1 pl-2 border-l border-border/60 ml-auto shrink-0 animate-in fade-in slide-in-from-right-2 duration-150">
              <span className="text-[11px] text-muted-foreground font-medium mr-1.5 whitespace-nowrap">
                {selectedRows.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive text-destructive"
                onClick={async () => {
                  if (confirm(`Delete ${selectedRows.size} categories?`)) {
                    for (const id of selectedRows) {
                      await apiRequest(`/admin/categories/${id}`, { method: "DELETE" }).catch(() => {})
                    }
                    toast.success(`${selectedRows.size} categories deleted`)
                    setSelectedRows(new Set())
                    loadRootCategories()
                  }
                }}
              >
                <Icon name="delete" size={14} className="size-3.5!" /> Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                onClick={() => setSelectedRows(new Set())}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 pl-2 border-l border-border/60 ml-auto shrink-0">
              {isSearchVisible ? (
                <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2 w-48 md:w-60 animate-in fade-in zoom-in-95 duration-200">
                  <Icon name="search" size={14} className="size-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none focus:outline-none text-xs text-foreground placeholder:text-muted-foreground w-full h-full pl-1 ml-0.5 shrink min-w-0"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                    >
                      <Icon name="close" size={12} className="size-3 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsSearchVisible(false)
                      setSearchQuery("")
                    }}
                    className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                  >
                    <Icon name="keyboard_double_arrow_right" size={14} className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background shadow-xs cursor-pointer"
                  onClick={() => setIsSearchVisible(true)}
                >
                  <Icon name="search" size={16} className="size-4! text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/40 sticky top-0 z-10 border-b border-border/60 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-[11px] font-medium select-none w-10 text-center">
                  <Checkbox
                    checked={
                      topLevelCategories.length > 0 && selectedRows.size === topLevelCategories.length
                    }
                    onCheckedChange={() => {
                      if (selectedRows.size === topLevelCategories.length) {
                        setSelectedRows(new Set())
                      } else {
                        setSelectedRows(new Set(topLevelCategories.map((c) => c.id)))
                      }
                    }}
                  />
                </th>
                <th className="px-3 py-2 text-[11px] font-medium select-none">
                  Category Name
                </th>
                <th className="px-3 py-2 text-[11px] font-medium select-none">
                  Slug
                </th>
                <th className="px-3 py-2 text-[11px] font-medium select-none">Level</th>
                <th className="px-3 py-2 text-[11px] font-medium select-none">Status</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium select-none pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {isLoading || isSearching ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="h-12 animate-pulse">
                    <td className="px-3 py-2.5 text-center">
                      <div className="size-4 bg-muted/60 rounded mx-auto" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="size-7 bg-muted/60 rounded shrink-0" />
                        <div className="h-4 w-36 bg-muted/60 rounded-full" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="h-3.5 w-24 bg-muted/60 rounded-full" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="h-5 w-20 bg-muted/60 rounded" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="h-5 w-14 bg-muted/60 rounded-md" />
                    </td>
                    <td className="px-3 py-2.5 text-right pr-4">
                      <div className="size-6 bg-muted/60 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : searchResults !== null ? (
                /* Render Flat Search Results */
                searchResults.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <p className="text-xs">No categories matching "{searchQuery}"</p>
                    </td>
                  </tr>
                ) : (
                  searchResults.map((cat) => (
                    <tr
                      key={cat.id}
                      onClick={() => openEditDialog(cat)}
                      className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    >
                      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRows.has(cat.id)}
                          onCheckedChange={() => toggleSelectRow(cat.id)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          {cat.imageUrl ? (
                            <img
                              src={cat.imageUrl}
                              alt={cat.name}
                              className="size-7 rounded object-cover border border-border/80 bg-muted shrink-0"
                            />
                          ) : (
                            <div className="size-7 rounded border border-border/80 bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                              <Icon name="category" size={14} className="size-3.5 opacity-60" />
                            </div>
                          )}
                          <span className="font-semibold text-foreground">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        /{cat.slug}
                      </td>
                      <td className="px-3 py-2.5">
                        <LevelBadge level={cat.level} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge isActive={cat.isActive} />
                      </td>
                      <td className="px-3 py-2.5 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground">
                              <Icon name="more_horiz" size={16} className="size-4!" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 font-ui p-1.5">
                            <DropdownMenuItem onClick={() => openEditDialog(cat)}>
                              <Icon name="edit" size={16} className="size-4 text-muted-foreground" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(cat.id)} className="text-destructive">
                              <Icon name="delete" size={16} className="size-4 text-destructive" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )
              ) : topLevelCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name="category" size={32} className="size-8 text-muted-foreground/40" />
                      <p className="text-xs">No main categories found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                topLevelCategories.map((topCat) => renderCategoryRow(topCat, 0))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 shrink-0 text-xs text-muted-foreground">
          <div>
            Showing {topLevelCategories.length} top-level categories (subcategories loaded on-demand)
          </div>
        </div>
      </div>

      {/* Clean Standard Shadcn Add / Edit Category Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[740px] font-ui">
          {/* Header */}
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Create New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category settings and details for your storefront."
                : "Add a new product taxonomy category to your store."}
            </DialogDescription>
          </DialogHeader>

          {/* Form Fields */}
          <div className="flex flex-col gap-4 p-1.5 text-xs max-h-[70vh] overflow-y-auto">
            {/* Tab Navigation & Auto Translate Bar */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-1">
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
                <button
                  type="button"
                  onClick={() => setActiveFormTab('en')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer select-none",
                    activeFormTab === 'en'
                      ? "bg-background text-foreground shadow-xs border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('ar')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-transparent select-none relative",
                    activeFormTab === 'ar'
                      ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  العربية (Arabic)
                  <span
                    className={cn(
                      "size-1.5 rounded-full bg-emerald-500 transition-opacity",
                      formArabicName ? "opacity-100" : "opacity-0 invisible"
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
                onClick={handleAutoTranslateCategory}
              >
                <svg className="size-3.5 text-emerald-600 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                </svg>
                {isGeneratingDesc ? "Translating..." : "Auto-Translate to Arabic"}
              </Button>
            </div>

            {/* Tab 1: English Content */}
            <div className={cn("flex flex-col gap-4 transition-opacity duration-150", activeFormTab !== 'en' && "hidden")}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  Category Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Birthday Cakes"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Description</label>
                <RichTextEditor
                  value={formDescription}
                  onChange={setFormDescription}
                  onGenerateAI={() => {
                    setIsGeneratingDesc(true)
                    setTimeout(() => {
                      setFormDescription(
                        `<p>Discover high-quality <strong>${formName || "products"}</strong> featuring premium handcrafted recipes and fresh ingredients.</p>`
                      )
                      setIsGeneratingDesc(false)
                    }, 1200)
                  }}
                  isGenerating={isGeneratingDesc}
                />
              </div>
            </div>

            {/* Tab 2: Arabic Content */}
            <div className={cn("flex flex-col gap-4 transition-opacity duration-150", activeFormTab !== 'ar' && "hidden")} dir="rtl">
              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-[13px] font-medium text-foreground">
                  Category Name (Arabic) / اسم الفئة بالعربية
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: كيك عيد الميلاد"
                  value={formArabicName}
                  onChange={(e) => setFormArabicName(e.target.value)}
                  className="w-full h-9 px-3 py-2 text-sm font-arabic bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 text-right"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-[13px] font-medium text-foreground">
                  Description (Arabic) / الوصف بالعربية
                </label>
                <div className="w-full rounded-md text-right font-arabic">
                  <RichTextEditor
                    dir="rtl"
                    value={formArabicDescription}
                    onChange={setFormArabicDescription}
                    onGenerateAI={handleAutoTranslateCategory}
                    isGenerating={isGeneratingDesc}
                  />
                </div>
              </div>
            </div>

            {/* Parent Category Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Parent Category</label>
              <select
                value={formParentId}
                onChange={(e) => setFormParentId(e.target.value)}
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              >
                <option value="">None (Top-Level Category)</option>
                {Array.from(
                  new Map([
                    ...topLevelCategories.map((c): [string, CategoryItem] => [c.id, c]),
                    ...Array.from(childrenMap.values())
                      .flat()
                      .map((c): [string, CategoryItem] => [c.id, c]),
                  ]).values()
                )
                  .filter((c) => c.id !== editingCategory?.id)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(c.level ?? 0)}
                      {c.name} (/{c.slug})
                    </option>
                  ))}
              </select>
            </div>

            {/* URL Handle / Slug */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-foreground">URL Handle (Slug)</label>
                {isSlugUserModified && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSlugUserModified(false)
                      setFormSlug(
                        formName
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "")
                      )
                    }}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    Reset auto-slug
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="birthday-cakes"
                value={formSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full h-9 px-3 py-2 text-sm font-mono bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>



            {/* Media Section */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-foreground">Media</label>
                <button
                  type="button"
                  onClick={() => setShowPresetPicker(!showPresetPicker)}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {showPresetPicker ? "Hide presets" : "Select from preset gallery"}
                </button>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                {formImageUrl && (
                  <div className="relative size-24 group rounded-lg overflow-hidden border border-border/60 bg-muted/20 shrink-0">
                    <img src={formImageUrl} alt="Banner" className="w-full h-full object-cover" />
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-white hover:text-red-400 hover:bg-white/10 cursor-pointer"
                        title="Delete Image"
                        onClick={() => setFormImageUrl("")}
                      >
                        <Icon name="delete" className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex gap-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-24 w-24 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer shrink-0"
                  >
                    <Icon name="add" className="size-6" />
                    <span className="text-[10px] mt-1 font-medium">Upload</span>
                  </div>
                </div>
              </div>

              {/* Preset Gallery Picker */}
              {showPresetPicker && (
                <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in duration-150">
                  {GALLERY_PRESETS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setFormImageUrl(url)
                        setShowPresetPicker(false)
                      }}
                      className="size-16 rounded-lg border border-border/60 overflow-hidden hover:border-primary transition-all cursor-pointer bg-muted"
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active Storefront Visibility */}
            <div className="flex items-center gap-2.5 mt-2">
              <Checkbox
                id="catActiveCheck"
                checked={formIsActive}
                onCheckedChange={(checked) => setFormIsActive(Boolean(checked))}
              />
              <label htmlFor="catActiveCheck" className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                Active & visible on storefront
              </label>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="h-8 text-xs cursor-pointer">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-xs cursor-pointer">
              {isSaving ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
