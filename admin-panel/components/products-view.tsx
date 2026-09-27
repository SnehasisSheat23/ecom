"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { apiRequest } from "@/lib/api-client"
import { toast } from "sonner"
import { ConfirmationModal } from "@/components/product-details/modals/confirmation-modal"
import { formatPrice } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { ResponsiveDataView, type ColumnDef, type SortOption } from "@/components/shared/responsive-data-view"
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
  stockQuantity?: number
}

const TABS = ["All", "Active", "Draft", "Archived"]

const SORT_OPTIONS: SortOption[] = [
  { label: "Product Title (A-Z)", value: "title_asc" },
  { label: "Product Title (Z-A)", value: "title_desc" },
  { label: "Price (Low to High)", value: "price_asc" },
  { label: "Price (High to Low)", value: "price_desc" },
  { label: "Status", value: "status_asc" },
]

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
    <div className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium text-[11px] ${bgColor} ${textColor}`}>
      {status}
    </div>
  )
}

interface ProductTypeInfo {
  lookup: Record<string, { name: string; slug: string }>
  slugToIdMap: Record<string, string>
}

let productTypesCache: ProductTypeInfo | null = null

async function getProductTypeData(): Promise<ProductTypeInfo> {
  if (productTypesCache) return productTypesCache
  const lookup: Record<string, { name: string; slug: string }> = {}
  const slugToIdMap: Record<string, string> = {}

  try {
    const res = await apiRequest("/product-types")
    if (res.ok) {
      const body = await res.json()
      if (body.data?.items) {
        body.data.items.forEach((t: { id: string; name: string; slug: string }) => {
          lookup[t.id] = { name: t.name, slug: t.slug }
          slugToIdMap[t.slug.toLowerCase()] = t.id
          slugToIdMap[t.slug.toLowerCase().replace("-", "")] = t.id
        })
      }
    }
  } catch (e) {
    console.warn("Failed to fetch product-types:", e)
  }

  productTypesCache = { lookup, slugToIdMap }
  return productTypesCache
}

export function ProductsView() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("All")
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)

  // Search & Filter States
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [stockFilter, setStockFilter] = React.useState<string>("all")
  const [activeSort, setActiveSort] = React.useState<string>("title_asc")
  const [categoriesList, setCategoriesList] = React.useState<Array<{ id: string; name: string }>>([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)

  // Fetch all categories for filter dropdown
  React.useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiRequest("/categories")
        if (res.ok) {
          const body = await res.json()
          const raw = body.data || []
          const list: Array<{ id: string; name: string }> = []
          const extract = (items: any[]) => {
            for (const item of items) {
              const name = item.name || item.translations?.en?.name || item.slug || "Category"
              if (!list.some((c) => c.id === item.id)) {
                list.push({ id: item.id, name })
              }
              if (item.children && Array.isArray(item.children)) {
                extract(item.children)
              }
            }
          }
          extract(Array.isArray(raw) ? raw : [])
          setCategoriesList(list)
        }
      } catch (e) {
        console.warn("Failed to load categories for filtering:", e)
      }
    }
    loadCategories()
  }, [])

  // Debounce search query by 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadProducts = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const typeData = await getProductTypeData()

      let url = `/products?limit=100&currency=SAR`
      if (activeTab !== "All") {
        url += `&status=${encodeURIComponent(activeTab.toLowerCase())}`
      }
      if (debouncedSearchQuery.trim()) {
        url += `&q=${encodeURIComponent(debouncedSearchQuery.trim())}`
      }
      if (categoryFilter !== "all") {
        url += `&categoryId=${encodeURIComponent(categoryFilter)}`
      }
      if (activeSort) {
        url += `&sort=${encodeURIComponent(activeSort)}`
      }

      const res = await apiRequest(url)
      if (res.ok) {
        const body = await res.json()
        const itemsList = body.data?.items || body.data || []
        if (Array.isArray(itemsList)) {
          const typeLookup = typeData.lookup
          const mapped = itemsList.map((p: any) => {
            const rawStatus = p.status || "active"
            const capitalizedStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as "Active" | "Draft" | "Archived"

            const typeInfo = p.productTypeId ? typeLookup[p.productTypeId] : null
            const typeName = typeInfo?.name || (p.productType ? p.productType.charAt(0).toUpperCase() + p.productType.slice(1) : "Physical")
            const typeSlug = typeInfo?.slug || (p.productType ? p.productType.toLowerCase() : "")

            const title = p.title || p.translations?.en?.title || p.sku || "Untitled Product"
            const numericPrice = typeof p.price === "number" ? p.price : (p.variants?.[0]?.price ?? 0)
            const activeCurrency = p.currency || "SAR"

            const priceFormatted = numericPrice > 0
              ? formatPrice(numericPrice, { currency: activeCurrency, isMinorUnit: false })
              : "-"
            const rawCompareAt = p.compareAtPrice ?? p.variants?.[0]?.compareAtPrice
            const compareAtFormatted = rawCompareAt
              ? formatPrice(rawCompareAt, { currency: activeCurrency, isMinorUnit: false })
              : null

            const imageUrl = Array.isArray(p.images) && p.images.length > 0
              ? (typeof p.images[0] === "string" ? p.images[0] : p.images[0]?.url)
              : "https://placehold.co/100x100?text=No+Image"

            return {
              id: p.id,
              image: imageUrl,
              title: title,
              status: capitalizedStatus,
              price: priceFormatted,
              compareAtPrice: compareAtFormatted,
              category: p.categoryName || p.categories?.[0]?.name || "-",
              type: typeName,
              typeSlug: typeSlug,
              productTypeId: p.productTypeId,
              vendor: p.vendorName || p.attributes?.origin || "Store",
              stockQuantity: p.stockQuantity ?? 100,
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
  }, [debouncedSearchQuery, activeTab, categoryFilter, activeSort])

  React.useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const selectedProductTitles = React.useMemo(() => {
    return products.filter((p) => selectedIds.has(p.id)).map((p) => p.title)
  }, [products, selectedIds])

  const handleBulkDeleteConfirm = async () => {
    try {
      const ids = Array.from(selectedIds)
      const res = await apiRequest("/admin/products/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      })

      if (res.ok) {
        toast.success(`Successfully deleted ${ids.length} products`)
        setSelectedIds(new Set())
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

  const combinedCategoryOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const cat of categoriesList) {
      if (cat.id) map.set(cat.id, cat.name)
    }
    for (const p of products) {
      if (p.category && p.category !== "-" && !map.has(p.category)) {
        map.set(p.category, p.category)
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [categoriesList, products])

  // Client-side fallback filtering for stock
  const filteredProducts = React.useMemo(() => {
    let result = [...products]
    if (stockFilter === "in_stock") {
      result = result.filter((p) => (p.stockQuantity ?? 0) > 0)
    } else if (stockFilter === "out_of_stock") {
      result = result.filter((p) => (p.stockQuantity ?? 0) <= 0)
    }
    return result
  }, [products, stockFilter])

  const handleAddProduct = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const res = await apiRequest("/admin/products", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled Product",
          status: "draft",
          currency: "SAR",
          variants: [
            {
              sku: "AUTO",
              title: "Default",
              price: 10,
            },
          ],
        }),
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

  // Desktop Table Column Definitions
  const columns: ColumnDef<Product>[] = [
    {
      header: "Product",
      accessor: (p) => (
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.image}
            alt={p.title}
            className="size-9 rounded-md object-cover border border-border/50 shrink-0"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image"
            }}
          />
          <span className="font-medium text-foreground truncate max-w-xs md:max-w-md block" title={p.title}>
            {p.title}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (p) => <StatusBadge status={p.status} />,
    },
    {
      header: "Price",
      className: "text-foreground font-medium whitespace-nowrap",
      accessor: (p) => (
        <div className="flex items-center gap-1.5">
          <span>{p.price}</span>
          {p.compareAtPrice && (
            <span className="text-xs text-muted-foreground line-through font-normal">
              {p.compareAtPrice}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Category",
      className: "text-muted-foreground whitespace-nowrap",
      accessor: (p) => p.category,
    },
  ]

  // Filter Dropdown Component
  const filterDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-sm relative",
            (categoryFilter !== "all" || stockFilter !== "all") && "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
          )}
        >
          <Icon name="filter_list" size={16} className="size-4!" />
          {(categoryFilter !== "all" || stockFilter !== "all") && (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-emerald-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Category</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
          <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
          {combinedCategoryOptions.map((cat) => (
            <DropdownMenuRadioItem key={cat.value} value={cat.value}>
              {cat.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Stock Status</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={stockFilter} onValueChange={setStockFilter}>
          <DropdownMenuRadioItem value="all">All Stock</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="in_stock">In Stock (&gt;0)</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="out_of_stock">Out of Stock (0)</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        {(categoryFilter !== "all" || stockFilter !== "all") && (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all")
                setStockFilter("all")
              }}
              className="w-full text-xs text-center py-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer font-medium"
            >
              Clear All Filters
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Active Filter Badges
  const activeFilterBadges = (categoryFilter !== "all" || stockFilter !== "all" || searchQuery.trim()) && (
    <div className="flex items-center flex-wrap gap-1.5 px-3.5 py-2 bg-primary/5 border-b border-border/60 text-xs">
      <span className="text-muted-foreground font-medium mr-1 text-[11px]">Active Filters:</span>
      {categoryFilter !== "all" && (
        <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full text-primary text-[11px] font-medium">
          Category: <strong>{combinedCategoryOptions.find((c) => c.value === categoryFilter)?.label || categoryFilter}</strong>
          <button type="button" onClick={() => setCategoryFilter("all")} className="hover:text-destructive cursor-pointer ml-0.5">
            <Icon name="close" size={12} className="size-3" />
          </button>
        </span>
      )}
      {stockFilter !== "all" && (
        <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full text-primary text-[11px] font-medium">
          Stock: <strong>{stockFilter === "in_stock" ? "In Stock" : "Out of Stock"}</strong>
          <button type="button" onClick={() => setStockFilter("all")} className="hover:text-destructive cursor-pointer ml-0.5">
            <Icon name="close" size={12} className="size-3" />
          </button>
        </span>
      )}
      {searchQuery.trim() && (
        <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full text-primary text-[11px] font-medium">
          Search: &quot;{searchQuery}&quot;
          <button type="button" onClick={() => setSearchQuery("")} className="hover:text-destructive cursor-pointer ml-0.5">
            <Icon name="close" size={12} className="size-3" />
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          setCategoryFilter("all")
          setStockFilter("all")
          setSearchQuery("")
        }}
        className="text-[11px] text-primary hover:underline ml-1 cursor-pointer font-medium"
      >
        Clear all
      </button>
    </div>
  )

  return (
    <>
      <ResponsiveDataView<Product>
        title="Products"
        primaryAction={{
          label: "Add product",
          onClick: handleAddProduct,
          loading: isCreating,
        }}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchPlaceholder="Search products..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterDropdown={filterDropdown}
        activeFilterBadges={activeFilterBadges}
        sortOptions={SORT_OPTIONS}
        activeSort={activeSort}
        onSortChange={setActiveSort}
        items={filteredProducts}
        getItemId={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="No products found"
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={
          <Button
            variant="ghost"
            className="h-8 text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer ml-auto font-semibold"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Delete
          </Button>
        }
        columns={columns}
        renderMobileCard={(product) => (
          <div className="py-3 px-3.5 flex items-center gap-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors">
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.title}
              className="size-12 rounded-xl object-cover border border-border/40 bg-muted/20 shadow-2xs shrink-0"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image"
              }}
            />

            {/* Title & Category Info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-medium text-[13.5px] leading-snug text-foreground line-clamp-2">
                {product.title}
              </h2>
              {product.category && product.category !== "-" && (
                <p className="text-[11.5px] text-muted-foreground/80 mt-0.5 truncate font-normal">
                  {product.category}
                </p>
              )}
            </div>

            {/* Price & Subtle Chevron */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className="font-semibold text-[13.5px] tracking-tight text-foreground block">
                  {product.price}
                </span>
                {product.compareAtPrice && (
                  <span className="text-[11px] text-muted-foreground/60 line-through block font-normal">
                    {product.compareAtPrice}
                  </span>
                )}
              </div>
              <Icon
                name="chevron_right"
                size={16}
                className="text-muted-foreground/30 size-4"
              />
            </div>
          </div>
        )}
        onRowClick={(product) => router.push(`/dashboard/products/${product.id}`)}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Selected Products?"
        description="Are you sure you want to delete the selected products? This action is permanent and cannot be undone."
        itemsCount={selectedIds.size}
        itemsList={selectedProductTitles}
        confirmText="Delete"
      />
    </>
  )
}
