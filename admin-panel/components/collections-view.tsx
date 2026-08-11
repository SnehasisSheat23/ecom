"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
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

export interface CollectionItem {
  id: string
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  type: "MANUAL" | "AUTOMATED"
  sortOrder: string
  isActive: boolean
  metaTitle?: string | null
  metaDescription?: string | null
}

const DEFAULT_COLLECTIONS: CollectionItem[] = []

const GALLERY_PRESETS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500",
  "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=500",
  "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=500",
  "https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=500",
]

const TABS = ["All", "Manual", "Automated", "Active", "Draft"]

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

function TypeBadge({ type }: { type: "MANUAL" | "AUTOMATED" }) {
  const isAuto = type === "AUTOMATED"
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
        isAuto
          ? "bg-purple-100/80 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400"
          : "bg-blue-100/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
      }`}
    >
      {type}
    </span>
  )
}

export function CollectionsView() {
  const [collections, setCollections] = React.useState<CollectionItem[]>(DEFAULT_COLLECTIONS)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("All")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const [sortField, setSortField] = React.useState<keyof CollectionItem>("name")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  // Modal Dialog states
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingCollection, setEditingCollection] = React.useState<CollectionItem | null>(null)
  const [formName, setFormName] = React.useState("")
  const [formSlug, setFormSlug] = React.useState("")
  const [formDescription, setFormDescription] = React.useState("")
  const [formImageUrl, setFormImageUrl] = React.useState("")
  const [formType, setFormType] = React.useState<"MANUAL" | "AUTOMATED">("MANUAL")
  const [formSortOrder, setFormSortOrder] = React.useState("MANUAL")
  const [formIsActive, setFormIsActive] = React.useState(true)
  const [isSlugUserModified, setIsSlugUserModified] = React.useState(false)
  const [isGeneratingDesc, setIsGeneratingDesc] = React.useState(false)
  const [showPresetPicker, setShowPresetPicker] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Live Auto-generate Slug from Name
  const handleNameChange = (val: string) => {
    setFormName(val)
    if (!isSlugUserModified) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      setFormSlug(generated)
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
    setEditingCollection(null)
    setFormName("")
    setFormSlug("")
    setFormDescription("")
    setFormImageUrl("")
    setFormType("MANUAL")
    setFormSortOrder("MANUAL")
    setFormIsActive(true)
    setIsSlugUserModified(false)
    setShowPresetPicker(false)
    setIsAddOpen(true)
  }

  const openEditDialog = (col: CollectionItem) => {
    setEditingCollection(col)
    setFormName(col.name)
    setFormSlug(col.slug)
    setFormDescription(col.description || "")
    setFormImageUrl(col.imageUrl || "")
    setFormType(col.type)
    setFormSortOrder(col.sortOrder)
    setFormIsActive(col.isActive)
    setIsSlugUserModified(true)
    setShowPresetPicker(false)
    setIsAddOpen(true)
  }

  const handleSave = () => {
    if (!formName.trim()) return

    const finalSlug = formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]+/g, "-")

    if (editingCollection) {
      setCollections((prev) =>
        prev.map((c) =>
          c.id === editingCollection.id
            ? {
                ...c,
                name: formName,
                slug: finalSlug,
                description: formDescription,
                imageUrl: formImageUrl,
                type: formType,
                sortOrder: formSortOrder,
                isActive: formIsActive,
              }
            : c
        )
      )
    } else {
      const newCol: CollectionItem = {
        id: `col-${Date.now()}`,
        name: formName,
        slug: finalSlug,
        description: formDescription,
        imageUrl: formImageUrl,
        type: formType,
        sortOrder: formSortOrder,
        isActive: formIsActive,
      }
      setCollections((prev) => [newCol, ...prev])
    }
    setIsAddOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this collection?")) {
      setCollections((prev) => prev.filter((c) => c.id !== id))
      setSelectedRows((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredCollections.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredCollections.map((c) => c.id)))
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

  const toggleSort = (field: keyof CollectionItem) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: keyof CollectionItem) => {
    if (sortField !== field) {
      return (
        <Icon
          name="swap_vert"
          size={14}
          className="size-3.5! text-muted-foreground opacity-30 hover:opacity-100 transition-opacity ml-0.5 inline-block"
        />
      )
    }
    return sortOrder === "asc" ? (
      <Icon name="arrow_upward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5 inline-block" />
    ) : (
      <Icon name="arrow_downward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5 inline-block" />
    )
  }

  const filteredCollections = React.useMemo(() => {
    return collections
      .filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.slug.toLowerCase().includes(searchQuery.toLowerCase())

        if (activeTab === "Manual") return matchesSearch && c.type === "MANUAL"
        if (activeTab === "Automated") return matchesSearch && c.type === "AUTOMATED"
        if (activeTab === "Active") return matchesSearch && c.isActive
        if (activeTab === "Draft") return matchesSearch && !c.isActive
        return matchesSearch
      })
      .sort((a, b) => {
        const aVal = a[sortField] ?? ""
        const bVal = b[sortField] ?? ""
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
        return 0
      })
  }, [collections, searchQuery, activeTab, sortField, sortOrder])

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Collections</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage manual & automated product sets ({collections.length} total)
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="h-8 gap-1.5 text-xs font-medium cursor-pointer">
          <Icon name="add" size={16} className="size-4!" />
          <span>Add collection</span>
        </Button>
      </div>

      {/* Collections Table Container */}
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
                onClick={() => {
                  if (confirm(`Delete ${selectedRows.size} collections?`)) {
                    setCollections((prev) => prev.filter((c) => !selectedRows.has(c.id)))
                    setSelectedRows(new Set())
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
                    placeholder="Search collections..."
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
                      filteredCollections.length > 0 && selectedRows.size === filteredCollections.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th
                  className="px-3 py-2 text-[11px] font-medium select-none cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => toggleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Collection Title {renderSortIcon("name")}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-[11px] font-medium select-none cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => toggleSort("slug")}
                >
                  <div className="flex items-center gap-1">
                    Slug {renderSortIcon("slug")}
                  </div>
                </th>
                <th className="px-3 py-2 text-[11px] font-medium select-none">Type</th>
                <th className="px-3 py-2 text-[11px] font-medium select-none">Sort Order</th>
                <th className="px-3 py-2 text-[11px] font-medium select-none">Status</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium select-none pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name="collections" size={32} className="size-8 text-muted-foreground/40" />
                      <p className="text-xs">No collections found matching your filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCollections.map((col) => {
                  const isSelected = selectedRows.has(col.id)
                  return (
                    <tr
                      key={col.id}
                      onClick={() => openEditDialog(col)}
                      className={`hover:bg-muted/40 transition-colors group cursor-pointer ${
                        isSelected ? "bg-muted/30" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(col.id)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          {col.imageUrl ? (
                            <img
                              src={col.imageUrl}
                              alt={col.name}
                              className="size-8 rounded-md object-cover border border-border/80 bg-muted shrink-0"
                            />
                          ) : (
                            <div className="size-8 rounded-md border border-border/80 bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                              <Icon name="collections" size={16} className="size-4 opacity-60" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground">{col.name}</div>
                            {col.description && (
                              <div
                                className="text-[11px] text-muted-foreground line-clamp-1"
                                dangerouslySetInnerHTML={{ __html: col.description.replace(/<[^>]*>?/gm, '') }}
                              />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        /{col.slug}
                      </td>
                      <td className="px-3 py-2.5">
                        <TypeBadge type={col.type} />
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground font-medium">
                        {col.sortOrder}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge isActive={col.isActive} />
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
                          <DropdownMenuContent align="end" className="w-44 font-ui p-1.5">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(col)}
                              className="cursor-pointer"
                            >
                              <Icon name="edit" size={16} className="size-4 text-muted-foreground" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(col.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Icon name="delete" size={16} className="size-4 text-destructive" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 shrink-0 text-xs text-muted-foreground">
          <div>
            Showing {filteredCollections.length} of {collections.length} collections
          </div>
        </div>
      </div>

      {/* Clean Standard Shadcn Add / Edit Collection Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[740px] font-ui">
          {/* Header */}
          <DialogHeader>
            <DialogTitle>
              {editingCollection ? "Edit Collection" : "Create New Collection"}
            </DialogTitle>
            <DialogDescription>
              {editingCollection
                ? "Update collection settings and rules for your storefront."
                : "Add a new manual or automated collection to your store."}
            </DialogDescription>
          </DialogHeader>

          {/* Form Fields with p-1.5 padding to prevent focus ring clipping */}
          <div className="flex flex-col gap-4 p-1.5 text-xs max-h-[70vh] overflow-y-auto">
            {/* Collection Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Collection Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Summer Sale 2026"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
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
                placeholder="summer-sale-2026"
                value={formSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full h-9 px-3 py-2 text-sm font-mono bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Type & Sort Order */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Collection Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as "MANUAL" | "AUTOMATED")}
                  className="w-full h-9 px-3 py-2 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="MANUAL">Manual (Hand-picked)</option>
                  <option value="AUTOMATED">Automated (Rule-based)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Sort Order</label>
                <select
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(e.target.value)}
                  className="w-full h-9 px-3 py-2 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="MANUAL">Manual Position</option>
                  <option value="BEST_SELLING">Best Selling</option>
                  <option value="PRICE_ASC">Price: Low to High</option>
                  <option value="PRICE_DESC">Price: High to Low</option>
                  <option value="CREATED_DESC">Newest First</option>
                </select>
              </div>
            </div>

            {/* Description using RichTextEditor (identical to product details) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Description</label>
              <RichTextEditor
                value={formDescription}
                onChange={setFormDescription}
                onGenerateAI={() => {
                  setIsGeneratingDesc(true)
                  setTimeout(() => {
                    setFormDescription(
                      `<p>Explore our exclusive <strong>${formName || "collection"}</strong> featuring curated items with premium build quality and competitive pricing.</p>`
                    )
                    setIsGeneratingDesc(false)
                  }, 1200)
                }}
                isGenerating={isGeneratingDesc}
              />
            </div>

            {/* Media Section (Identical to Product Details general info card) */}
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

            {/* Active Storefront Visibility (Clean line without card/icon container) */}
            <div className="flex items-center gap-2.5 mt-2">
              <Checkbox
                id="colActiveCheck"
                checked={formIsActive}
                onCheckedChange={(checked) => setFormIsActive(Boolean(checked))}
              />
              <label htmlFor="colActiveCheck" className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                Active & visible on storefront
              </label>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="h-8 text-xs cursor-pointer">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="h-8 text-xs cursor-pointer">
              {editingCollection ? "Save Changes" : "Create Collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
