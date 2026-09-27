"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export interface ColumnDef<T> {
  header: string
  accessor: (item: T, index: number) => React.ReactNode
  sortKey?: string
  className?: string
  headerClassName?: string
  hideOnMobile?: boolean
}

export interface SortOption {
  label: string
  value: string
}

export interface PrimaryAction {
  label: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  icon?: string
}

export interface ResponsiveDataViewProps<T> {
  title: string
  subtitle?: string
  hideDesktopTitle?: boolean
  topContent?: React.ReactNode
  primaryAction?: PrimaryAction
  extraHeaderActions?: React.ReactNode

  // Tabs
  tabs?: string[]
  activeTab?: string
  onTabChange?: (tab: string) => void

  // Search
  searchPlaceholder?: string
  searchQuery?: string
  onSearchChange?: (query: string) => void

  // Custom filter slot or buttons
  filterDropdown?: React.ReactNode
  activeFilterBadges?: React.ReactNode

  // Sorting
  sortOptions?: SortOption[]
  activeSort?: string
  onSortChange?: (sort: string) => void

  // Data & State
  items: T[]
  getItemId: (item: T) => string
  isLoading?: boolean
  emptyMessage?: string

  // Row Selection
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  bulkActions?: React.ReactNode

  // Columns & Mobile Rendering
  columns: ColumnDef<T>[]
  renderMobileItem?: (item: T, isSelected: boolean, toggleSelect: (checked: boolean) => void) => React.ReactNode
  renderMobileCard?: (item: T, isSelected: boolean, toggleSelect: (checked: boolean) => void) => React.ReactNode
  onRowClick?: (item: T) => void

  // Pagination (Optional)
  currentPage?: number
  totalPages?: number
  totalItems?: number
  onPageChange?: (page: number) => void
}

export function ResponsiveDataView<T>({
  title,
  subtitle,
  hideDesktopTitle = false,
  topContent,
  primaryAction,
  extraHeaderActions,
  tabs,
  activeTab,
  onTabChange,
  searchPlaceholder = "Search...",
  searchQuery,
  onSearchChange,
  filterDropdown,
  activeFilterBadges,
  sortOptions,
  activeSort,
  onSortChange,
  items,
  getItemId,
  isLoading = false,
  emptyMessage = "No items found",
  selectedIds,
  onSelectionChange,
  bulkActions,
  columns,
  renderMobileItem,
  renderMobileCard,
  onRowClick,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: ResponsiveDataViewProps<T>) {
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)

  const hasSelection = selectedIds && onSelectionChange
  const isAllSelected = hasSelection && items.length > 0 && items.every((item) => selectedIds.has(getItemId(item)))

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) {
      onSelectionChange(new Set(items.map((item) => getItemId(item))))
    } else {
      onSelectionChange(new Set())
    }
  }

  const handleToggleRow = (id: string, checked: boolean) => {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (checked) {
      next.add(id)
    } else {
      next.delete(id)
    }
    onSelectionChange(next)
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 px-3 pt-3 sm:px-4 sm:pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui">
      {/* Desktop Header (Exact Classic Styling matching Categories) */}
      {!hideDesktopTitle && (
        <div className="hidden md:flex items-center justify-between pb-1 sm:pb-2 gap-2 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground select-none">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            {extraHeaderActions}
            {primaryAction && (
              <Button
                className="h-8 shadow-xs text-xs px-3 sm:px-4 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-medium"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || primaryAction.loading}
              >
                {primaryAction.loading ? "Creating..." : primaryAction.label}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Optional Desktop Top Content (e.g. Overview Stats matching Quotations layout) */}
      {topContent && (
        <div className="hidden md:block shrink-0">
          {topContent}
        </div>
      )}

      {/* Mobile Header (Title, Search + Quick Action, Mobile Tabs) */}
      <div className="flex md:hidden flex-col gap-3 pb-1.5 shrink-0">
        <div className="flex items-center justify-between gap-2 pt-1">
          <h1 className="text-[26px] font-bold tracking-tight text-foreground select-none leading-tight">{title}</h1>
          {extraHeaderActions}
        </div>

        <div className="flex items-center gap-2 w-full">
          {onSearchChange && (
            <div className="relative flex-1">
              <Icon
                name="search"
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4.5 pointer-events-none"
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-11 pl-10 pr-9 rounded-xl bg-card border border-border/90 text-foreground placeholder:text-muted-foreground/75 text-sm font-normal focus:outline-hidden focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10 shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-full hover:bg-muted active:scale-95"
                >
                  <Icon name="close" size={14} className="size-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Quick Filter (if available) */}
          {filterDropdown && (
            <div className="shrink-0">
              {filterDropdown}
            </div>
          )}

          {/* Quick Primary Action Button (+) */}
          {primaryAction && (
            <button
              type="button"
              className="size-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-semibold shrink-0 shadow-xs flex items-center justify-center active:scale-95 transition-all"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              title={primaryAction.label}
              aria-label={primaryAction.label}
            >
              {primaryAction.loading ? (
                <Icon name="progress_activity" size={18} className="animate-spin size-4.5" />
              ) : (
                <Icon name="add" size={22} className="size-5.5" />
              )}
            </button>
          )}
        </div>

        {/* Mobile Tabs */}
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  "h-8 px-3.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer select-none shrink-0",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/90"
                )}
                onClick={() => onTabChange?.(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Mobile Active Filter Badges */}
        {activeFilterBadges && (
          <div className="shrink-0">
            {activeFilterBadges}
          </div>
        )}
      </div>

      {/* Main Table Container (Clean list on mobile, table card on desktop) */}
      <div className="md:border md:border-border/80 md:rounded-lg overflow-hidden md:bg-card/40 md:shadow-xs flex flex-col flex-1 min-h-0 mt-1 sm:mt-2 bg-transparent">
        {/* Desktop Toolbar & Filters (Hidden on Mobile) */}
        <div className="hidden md:flex items-center justify-between border-b border-border/60 bg-muted/20 px-2 h-12 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-fade-right pr-4 flex-1 min-w-0">
            {tabs &&
              tabs.map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "secondary" : "ghost"}
                  className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    activeTab === tab
                      ? "bg-muted text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                  onClick={() => onTabChange?.(tab)}
                >
                  {tab}
                </Button>
              ))}
          </div>

          {/* Search, Filters, Sort */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-border/60 ml-auto shrink-0">
            {onSearchChange && (
              <>
                {isSearchVisible ? (
                  <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2.5 w-52 md:w-64 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
                    <Icon name="search" size={16} className="size-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchQuery || ""}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="bg-transparent border-none outline-none focus:outline-none text-xs text-foreground placeholder:text-muted-foreground w-full h-full pl-1 ml-0.5 shrink min-w-0"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => onSearchChange("")}
                        className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                      >
                        <Icon name="close" size={14} className="size-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsSearchVisible(false)
                        onSearchChange("")
                      }}
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
                    {filterDropdown}
                  </div>
                )}
              </>
            )}

            {sortOptions && sortOptions.length > 0 && onSortChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 bg-background shadow-xs cursor-pointer text-muted-foreground hover:text-foreground">
                    <Icon name="swap_vert" size={16} className="size-4!" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={activeSort} onValueChange={onSortChange}>
                    {sortOptions.map((opt) => (
                      <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Active Filter Badges (Desktop) */}
        {activeFilterBadges && (
          <div className="hidden md:block">
            {activeFilterBadges}
          </div>
        )}

        {/* Selected Rows Bulk Actions Bar Overlay */}
        {selectedIds && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-background border-b border-border/60 text-foreground px-4 h-12 shrink-0 animate-in slide-in-from-top-4 duration-300">
            <span className="text-sm font-medium mr-2 text-muted-foreground">{selectedIds.size} selected</span>
            <Button
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => onSelectionChange?.(new Set())}
            >
              Cancel
            </Button>
            {bulkActions}
          </div>
        )}

        {/* ========================================================================= */}
        {/* DESKTOP TABLE VIEW (hidden on mobile, visible on md:block)                */}
        {/* ========================================================================= */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 -webkit-overflow-scrolling-touch">
          <table className="w-full text-left border-collapse text-sm min-w-full">
            <thead className="sticky top-0 bg-card backdrop-blur-xs font-ui text-xs font-semibold text-muted-foreground border-b border-border/60 z-10 select-none">
              <tr>
                {hasSelection && (
                  <th className="px-4 py-3 w-10 text-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(val) => handleSelectAll(!!val)}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th key={idx} className={cn("px-4 py-3 font-semibold text-foreground select-none", col.headerClassName)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="h-[68px] animate-pulse">
                    {hasSelection && (
                      <td className="px-4 py-3.5 text-center">
                        <div className="size-4 bg-muted/60 rounded mx-auto" />
                      </td>
                    )}
                    {columns.map((_, cIdx) => (
                      <td key={cIdx} className="px-4 py-3.5">
                        <div className="h-4 w-28 bg-muted/60 rounded-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (hasSelection ? 1 : 0)} className="p-8 text-center text-muted-foreground font-ui text-sm">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const id = getItemId(item)
                  const isSelected = selectedIds?.has(id) || false

                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        "hover:bg-muted/30 cursor-pointer duration-150 text-sm",
                        isSelected ? "bg-muted/40" : "bg-card"
                      )}
                    >
                      {hasSelection && (
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(val) => handleToggleRow(id, !!val)}
                            aria-label={`Select item ${id}`}
                          />
                        </td>
                      )}
                      {columns.map((col, cIdx) => (
                        <td key={cIdx} className={cn("px-4 py-3.5", col.className)}>
                          {col.accessor(item, idx)}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE CARD LIST VIEW (visible on mobile, hidden on md:hidden)            */}
        {/* ========================================================================= */}
        <div className="block md:hidden overflow-y-auto flex-1 divide-y divide-border/40 -webkit-overflow-scrolling-touch">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="py-3.5 px-4 flex items-center gap-3.5 animate-pulse">
                <div className="size-11 bg-muted/60 rounded-md shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 w-40 bg-muted/60 rounded-full" />
                  <div className="h-3 w-24 bg-muted/40 rounded-full" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-ui text-xs">
              {emptyMessage}
            </div>
          ) : (
            items.map((item) => {
              const id = getItemId(item)
              const isSelected = selectedIds?.has(id) || false
              const mobileRenderer = renderMobileItem || renderMobileCard

              if (mobileRenderer) {
                return (
                  <div
                    key={id}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "transition-colors cursor-pointer active:bg-muted/40",
                      isSelected ? "bg-muted/40" : "bg-transparent"
                    )}
                  >
                    {mobileRenderer(item, isSelected, (checked) => handleToggleRow(id, checked))}
                  </div>
                )
              }

              // Default fallback list item if custom renderer is not supplied
              return (
                <div
                  key={id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "py-3.5 px-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer active:bg-muted/40",
                    isSelected ? "bg-muted/40" : "bg-transparent"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">{columns[0]?.accessor(item, 0)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{columns[1]?.accessor(item, 1)}</div>
                  </div>
                  <Icon name="chevron_right" size={18} className="size-4.5 text-muted-foreground shrink-0" />
                </div>
              )
            })
          )}
        </div>

        {/* Optional Pagination Footer */}
        {totalPages && totalPages > 1 && onPageChange && (
          <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 bg-card text-xs text-muted-foreground shrink-0">
            <span>
              Page {currentPage || 1} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 cursor-pointer"
                disabled={(currentPage || 1) <= 1}
                onClick={() => onPageChange((currentPage || 1) - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 cursor-pointer"
                disabled={(currentPage || 1) >= totalPages}
                onClick={() => onPageChange((currentPage || 1) + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
