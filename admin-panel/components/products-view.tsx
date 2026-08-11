"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter, useSearchParams } from "next/navigation"
import { apiRequest } from "@/lib/api-client"
import { toast } from "sonner"
import { ConfirmationModal } from "@/components/product-details/modals/confirmation-modal"
import { formatPrice } from "@/lib/currency"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

interface Product {
  id: string
  image: string
  title: string
  status: "Active" | "Draft" | "Archived"
  price: string
  compareAtPrice?: string | null
  category: string
  type: string
  typeSlug: string
  productTypeId?: string
  vendor: string
}

interface ProductVariant {
  isDefault?: boolean
  sku?: string
  price: number
  compareAtPrice?: number | null
}

interface APISalesChannel {
  name: string
  status: string
  createdAt?: string
}

interface RawProduct {
  id: string
  title: string
  status?: string
  productType?: string
  productTypeId?: string
  images?: Array<{ url: string }>
  categories?: Array<{ name: string }>
  vendorName?: string
  variants?: ProductVariant[]
  salesChannels?: APISalesChannel[]
  currency?: string
}

const TABS = ["All", "Active", "Draft", "Archived"]

function StatusBadge({ status }: { status: string }) {
  let bgColor = "bg-zinc-200/80 dark:bg-zinc-800"
  let textColor = "text-zinc-800 dark:text-zinc-300"
  
  if (status === "Active") {
    bgColor = "bg-emerald-200/90 dark:bg-emerald-950/70"
    textColor = "text-emerald-900 dark:text-emerald-300"
  } else if (status === "Draft") {
    bgColor = "bg-blue-200/90 dark:bg-blue-950/70"
    textColor = "text-blue-900 dark:text-blue-300"
  } else if (status === "Archived") {
    bgColor = "bg-zinc-200/80 dark:bg-zinc-800"
    textColor = "text-zinc-800 dark:text-zinc-300"
  }

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-xs ${bgColor} ${textColor}`}>
      {status}
    </div>
  )
}

export function ProductsView() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type") // e.g. "cake", "flower", "plant", "add-on"
  const [isCreating, setIsCreating] = React.useState(false)

  // Search & Sort States
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)
  const [sortField, setSortField] = React.useState<keyof Product>("title")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  // Debounce search query by 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)

  const loadProducts = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const DEFAULT_SLUG_TO_ID: Record<string, string> = {
        cake: "c92aaec7-4671-478b-9f9d-4c784b33bcb9",
        flower: "186d443c-9661-489c-8a72-e0453eca7517",
        plant: "de9ca3b8-1abb-40e4-9ec4-07976c12d037",
        "add-on": "b207911e-f7a5-4efd-92ea-054ae0aa3dc3",
        addon: "b207911e-f7a5-4efd-92ea-054ae0aa3dc3",
      }

      const typeLookup: Record<string, { name: string; slug: string }> = {
        "c92aaec7-4671-478b-9f9d-4c784b33bcb9": { name: "Cake", slug: "cake" },
        "186d443c-9661-489c-8a72-e0453eca7517": { name: "Flower", slug: "flower" },
        "de9ca3b8-1abb-40e4-9ec4-07976c12d037": { name: "Plant", slug: "plant" },
        "b207911e-f7a5-4efd-92ea-054ae0aa3dc3": { name: "Add-on", slug: "add-on" },
      }
      const slugToIdMap: Record<string, string> = { ...DEFAULT_SLUG_TO_ID }

      try {
        const typeRes = await apiRequest("/product-types")
        if (typeRes.ok) {
          const typeBody = await typeRes.json()
          if (typeBody.data?.items) {
            typeBody.data.items.forEach((t: { id: string; name: string; slug: string }) => {
              typeLookup[t.id] = { name: t.name, slug: t.slug }
              slugToIdMap[t.slug.toLowerCase()] = t.id
            })
          }
        }
      } catch (e) {
        console.warn("Failed to fetch product-types, using defaults:", e)
      }

      let url = "/admin/products?perPage=25&summary=true"
      if (typeParam) {
        const normalizedSlug = typeParam.toLowerCase().trim()
        const matchingTypeId = slugToIdMap[normalizedSlug] || slugToIdMap[normalizedSlug.replace("-", "")]
        if (matchingTypeId) {
          url += `&productTypeId=${matchingTypeId}`
        }
      }
      if (debouncedSearchQuery.trim()) {
        url += `&search=${encodeURIComponent(debouncedSearchQuery.trim())}`
      }

      const res = await apiRequest(url)
      if (res.ok) {
        const body = await res.json()
        if (body.data?.items) {
          const mapped = body.data.items.map((p: RawProduct) => {
            const rawStatus = p.status || "draft"
            const capitalizedStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as "Active" | "Draft" | "Archived"
            
            const typeInfo = p.productTypeId ? typeLookup[p.productTypeId] : null
            const typeName = typeInfo?.name || (p.productType ? p.productType.charAt(0).toUpperCase() + p.productType.slice(1) : "Physical")
            const typeSlug = typeInfo?.slug || (p.productType ? p.productType.toLowerCase() : "")

            const defaultVariant = p.variants?.find((v: ProductVariant) => v.isDefault) || p.variants?.[0]
            const priceFormatted = defaultVariant 
              ? formatPrice(defaultVariant.price, { currency: p.currency || "INR", isMinorUnit: true }) 
              : "-"
            const compareAtFormatted = defaultVariant?.compareAtPrice 
              ? formatPrice(defaultVariant.compareAtPrice, { currency: p.currency || "INR", isMinorUnit: true }) 
              : null

            return {
              id: p.id,
              image: p.images?.[0]?.url || "https://placehold.co/100x100?text=No+Image",
              title: p.title,
              status: capitalizedStatus,
              price: priceFormatted,
              compareAtPrice: compareAtFormatted,
              category: p.categories?.[0]?.name || "-",
              type: typeName,
              typeSlug: typeSlug,
              productTypeId: p.productTypeId,
              vendor: p.vendorName || "-",
            }
          })
          setProducts(mapped)
        }
      } else {
        console.error("Failed to fetch products")
        toast.error("Failed to load products")
      }
    } catch (e) {
      console.error("Failed to load products from API:", e)
      toast.error("Error loading products")
    } finally {
      setIsLoading(false)
    }
  }, [typeParam, debouncedSearchQuery])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts()
  }, [loadProducts])

  const selectedProductTitles = React.useMemo(() => {
    return products
      .filter(p => selectedRows.has(p.id))
      .map(p => p.title)
  }, [products, selectedRows])

  const handleBulkDeleteConfirm = async () => {
    try {
      const selectedIds = Array.from(selectedRows)
      const res = await apiRequest("/admin/products/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds })
      })

      if (res.ok) {
        toast.success(`Successfully deleted ${selectedIds.length} products`)
        setSelectedRows(new Set())
        loadProducts()
      } else {
        toast.error("Failed to delete products")
      }
    } catch (e) {
      console.error("Failed to delete products:", e)
      toast.error("Network error deleting products")
    } finally {
      setIsDeleteModalOpen(false)
    }
  }

  // Dynamic Filtering & Sorting Logic
  const filteredProducts = React.useMemo(() => {
    let result = [...products]

    // 1. Tab Filtering
    if (activeTab !== "All") {
      result = result.filter(p => p.status === activeTab)
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(p => {
        return p.title.toLowerCase().includes(query) || 
               p.vendor.toLowerCase().includes(query) ||
               p.type.toLowerCase().includes(query)
      })
    }

    // 4. Sorting Logic
    result.sort((a, b) => {
      const valA = a[sortField]
      const valB = b[sortField]

      const strA = typeof valA === "string" ? valA.toLowerCase() : String(valA ?? "")
      const strB = typeof valB === "string" ? valB.toLowerCase() : String(valB ?? "")

      if (strA < strB) return sortOrder === "asc" ? -1 : 1
      if (strA > strB) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [products, activeTab, searchQuery, sortField, sortOrder, typeParam])

  // Column Visibility Checkers
  const hasPrice = isLoading || products.some(p => p.price && p.price.length > 0)
  const hasCategory = isLoading || products.some(p => p.category && p.category.length > 0)
  const hasType = isLoading || products.some(p => p.type && p.type.length > 0)
  const hasMarkets = false
  const hasVendor = false

  // Row Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredProducts.map(p => p.id)
      setSelectedRows(new Set(allFilteredIds))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (productId: string, checked: boolean) => {
    const newSelection = new Set(selectedRows)
    if (checked) {
      newSelection.add(productId)
    } else {
      newSelection.delete(productId)
    }
    setSelectedRows(newSelection)
  }

  const toggleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: keyof Product) => {
    if (sortField !== field) {
      return <Icon name="swap_vert" size={14} className="size-3.5! text-muted-foreground opacity-30 hover:opacity-100 transition-opacity ml-0.5" />
    }
    return sortOrder === "asc"
      ? <Icon name="arrow_upward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5" />
      : <Icon name="arrow_downward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5" />
  }

  const handleAddProduct = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const res = await apiRequest("/admin/products", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled Product",
          status: "draft",
          variants: [
            {
              sku: "AUTO",
              title: "Default",
              price: 1000 // Default to $10.00
            }
          ]
        })
      })

      if (res.ok) {
        const body = await res.json()
        if (body.data?.id) {
          toast.success("Product draft created")
          router.push(`/dashboard/products/${body.data.id}`)
        } else {
          toast.error("Failed to create product draft")
        }
      } else {
        toast.error("Failed to create product draft")
      }
    } catch (e) {
      console.error("Failed to create product:", e)
      toast.error("Error creating product")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui">
      
      {/* Header section with title and actions */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Products</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 text-sm px-3.5 font-medium shadow-xs">Export</Button>
          <Button variant="outline" size="sm" className="h-9 text-sm px-3.5 font-medium shadow-xs">Import</Button>
          <Button variant="outline" size="sm" className="h-9 text-sm px-3.5 font-medium shadow-xs pr-2.5 gap-1">
            More actions <Icon name="expand_more" className="size-4!" />
          </Button>
          <Button 
            size="sm"
            className="h-9 text-sm px-4 shadow-xs bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer font-medium"
            onClick={handleAddProduct}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Add product"}
          </Button>
        </div>
      </div>

      {/* Top Metrics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 border border-border/80 bg-card rounded-xl shadow-xs divide-y md:divide-y-0 md:divide-x divide-border/60 overflow-hidden">
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            Products by sell-through rate
          </span>
          <div className="text-sm font-medium text-foreground flex items-center gap-1.5 mt-0.5">
            <span>0%</span>
            <span className="text-muted-foreground">—</span>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            Products by days of inventory remaining
          </span>
          <div className="text-sm text-muted-foreground mt-0.5">
            No data
          </div>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            ABC product analysis
          </span>
          <div className="text-sm text-muted-foreground mt-0.5">
            No data
          </div>
        </div>
      </div>

      {/* Products Table Container */}
      <div className="border-t border-x border-b-0 border-border/80 rounded-t-xl rounded-b-none overflow-hidden bg-card flex flex-col flex-1 min-h-0">
        
        {/* Toolbar & Filters */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card px-3 h-12 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-fade-right pr-4 flex-1 min-w-0">
            {TABS.map(tab => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab ? "bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Button>
            ))}
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer shrink-0 ml-1 rounded-md"
            >
              <Icon name="add" size={16} className="size-4!" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 pl-3 border-l border-border/60 ml-auto shrink-0">
            {isSearchVisible ? (
              <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2.5 w-52 md:w-64 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
                <Icon name="search" size={16} className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none focus:outline-none text-xs text-foreground placeholder:text-muted-foreground w-full h-full pl-1 ml-0.5 shrink min-w-0"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center">
                    <Icon name="close" size={14} className="size-3.5 text-muted-foreground" />
                  </button>
                )}
                <button 
                  onClick={() => { setIsSearchVisible(false); setSearchQuery(""); }} 
                  className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <Icon name="keyboard_double_arrow_right" size={16} className="size-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-background border border-border rounded-md p-0.5 shadow-xs gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-sm"
                  onClick={() => setIsSearchVisible(true)}
                >
                  <Icon name="search" size={16} className="size-4!" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-sm"
                >
                  <Icon name="filter_list" size={16} className="size-4!" />
                </Button>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-background shadow-xs cursor-pointer text-muted-foreground hover:text-foreground">
                  <Icon name="swap_vert" size={16} className="size-4!" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={`${sortField}-${sortOrder}`} onValueChange={(val) => {
                  const [field, order] = val.split("-")
                  setSortField(field as keyof Product)
                  setSortOrder(order as "asc" | "desc")
                }}>
                  <DropdownMenuRadioItem value="title-asc">Product Title (A-Z)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="title-desc">Product Title (Z-A)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="status-asc">Status</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="vendor-asc">Vendor</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selected Rows Bulk Actions Bar Overlay */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-2 bg-background border-b border-border/60 text-foreground px-4 h-12 shrink-0 animate-in slide-in-from-top-4 duration-300">
            <span className="text-sm font-medium mr-2 text-muted-foreground">{selectedRows.size} selected</span>
            <Button 
              variant="ghost" 
              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setSelectedRows(new Set())}
            >
              Cancel
            </Button>
            <Button 
              variant="ghost" 
              className="h-8 text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer ml-auto font-semibold"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Delete
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 bg-card backdrop-blur-xs font-ui text-xs font-semibold text-muted-foreground border-b border-border/60 z-10">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <Checkbox
                    checked={
                      filteredProducts.length > 0 &&
                      filteredProducts.every(p => selectedRows.has(p.id))
                    }
                    onCheckedChange={(val) => handleSelectAll(!!val)}
                    aria-label="Select all products"
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-foreground select-none">
                  <div onClick={() => toggleSort("title")} className="flex items-center cursor-pointer hover:text-foreground">
                    Product {renderSortIcon("title")}
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-foreground select-none">
                  <div onClick={() => toggleSort("status")} className="flex items-center cursor-pointer hover:text-foreground">
                    Status {renderSortIcon("status")}
                  </div>
                </th>
                {hasPrice && (
                  <th className="px-4 py-3 font-semibold text-foreground select-none">
                    <div onClick={() => toggleSort("price" as keyof Product)} className="flex items-center cursor-pointer hover:text-foreground">
                      Price {renderSortIcon("price" as keyof Product)}
                    </div>
                  </th>
                )}
                {hasCategory && (
                  <th className="px-4 py-3 font-semibold text-foreground select-none">
                    <div onClick={() => toggleSort("category")} className="flex items-center cursor-pointer hover:text-foreground">
                      Category {renderSortIcon("category")}
                    </div>
                  </th>
                )}
                {hasType && (
                  <th className="px-4 py-3 font-semibold text-foreground select-none">
                    <div onClick={() => toggleSort("type")} className="flex items-center cursor-pointer hover:text-foreground">
                      Type {renderSortIcon("type")}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="h-[68px] animate-pulse">
                    <td className="px-4 py-3.5 text-center">
                      <div className="size-4 bg-muted/60 rounded mx-auto" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-muted/60 rounded-md shrink-0" />
                        <div className="h-4 w-36 bg-muted/60 rounded-full" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-6 w-18 bg-muted/60 rounded-full" />
                    </td>
                    {hasPrice && (
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-16 bg-muted/60 rounded-full" />
                      </td>
                    )}
                    {hasCategory && (
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-20 bg-muted/60 rounded-full" />
                      </td>
                    )}
                    {hasType && (
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-16 bg-muted/60 rounded-full" />
                      </td>
                    )}
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground font-ui text-sm">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isSelected = selectedRows.has(product.id)
                  
                  return (
                    <tr
                      key={product.id}
                      onClick={() => router.push(`/dashboard/products/${product.id}`)}
                      className={`hover:bg-muted/30 cursor-pointer duration-150 text-sm ${
                        isSelected ? "bg-muted/40" : "bg-card"
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(val) => handleSelectRow(product.id, !!val)}
                          aria-label={`Select product ${product.title}`}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={product.image} 
                            alt={product.title} 
                            className="size-10 rounded-md object-cover border border-border/50 shrink-0"
                          />
                          <span className="font-medium text-foreground">{product.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={product.status} />
                      </td>
                      {hasPrice && (
                        <td className="px-4 py-3.5 text-foreground font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{product.price}</span>
                            {product.compareAtPrice && (
                              <span className="text-xs text-muted-foreground line-through font-normal">
                                {product.compareAtPrice}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {hasCategory && (
                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                          {product.category}
                        </td>
                      )}
                      {hasType && (
                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                          {product.type}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>



      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Selected Products?"
        description="Are you sure you want to delete the selected products? This action is permanent and cannot be undone."
        itemsCount={selectedRows.size}
        itemsList={selectedProductTitles}
        confirmText="Delete"
      />
    </div>
  )
}
