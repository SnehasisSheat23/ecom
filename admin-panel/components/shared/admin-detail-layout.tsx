"use client"

import * as React from "react"
import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface AdminDetailLayoutProps {
  backHref: string
  title: string
  statusBadge?: React.ReactNode
  headerActions?: React.ReactNode
  leftColumn: React.ReactNode
  rightColumn?: React.ReactNode

  // Unsaved changes bar
  hasChanges?: boolean
  isSaving?: boolean
  onSave?: () => void
  onDiscard?: () => void
  saveLabel?: string

  // Loading & Not Found states
  isLoading?: boolean
  notFound?: boolean
  notFoundMessage?: string
}

export function AdminDetailLayout({
  backHref,
  title,
  statusBadge,
  headerActions,
  leftColumn,
  rightColumn,
  hasChanges = false,
  isSaving = false,
  onSave,
  onDiscard,
  saveLabel = "Save",
  isLoading = false,
  notFound = false,
  notFoundMessage = "The requested record could not be found or has been deleted.",
}: AdminDetailLayoutProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full font-ui min-h-0">
        <div className="bg-background/95 pt-3 pb-2 sm:pt-6 sm:pb-2.5 px-3 sm:px-6 md:px-8 flex items-center gap-2.5 sm:gap-3.5 shrink-0 border-b border-border/40">
          <div className="size-8 rounded-lg bg-muted/30 animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-6 w-36 bg-muted/30 animate-pulse rounded" />
            <div className="h-5 w-16 bg-muted/20 animate-pulse rounded-full" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6 sm:px-6 md:px-8 md:pb-8 pt-3 sm:pt-1.5 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
          <div className="flex-1 w-full flex flex-col gap-4 sm:gap-6">
            <div className="h-48 w-full bg-muted/20 animate-pulse rounded-xl" />
            <div className="h-36 w-full bg-muted/20 animate-pulse rounded-xl" />
          </div>
          {rightColumn && (
            <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 sm:gap-6">
              <div className="h-40 w-full bg-muted/20 animate-pulse rounded-xl" />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 font-ui">
        <div className="text-center max-w-sm flex flex-col items-center gap-3">
          <div className="p-3 bg-muted/40 rounded-full">
            <Icon name="search_off" className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Record Not Found</h2>
          <p className="text-sm text-muted-foreground leading-normal">{notFoundMessage}</p>
          <Link href={backHref} className="mt-2">
            <Button size="sm" className="cursor-pointer">
              Go Back
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full font-ui min-h-0">
      {/* Top Header */}
      <div className="bg-background/95 pt-3 pb-2 sm:pt-6 sm:pb-2.5 px-3 sm:px-6 md:px-8 flex items-center justify-between shrink-0 border-b border-border/40">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <Link
            href={backHref}
            className="text-muted-foreground hover:text-foreground duration-200 flex items-center justify-center size-8 rounded-lg hover:bg-muted/60 transition-colors shrink-0"
          >
            <Icon name="arrow_back" className="size-5 text-[20px]" />
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <h2 className="text-base sm:text-xl font-bold font-heading text-foreground tracking-tight leading-none truncate max-w-[150px] sm:max-w-md md:max-w-xl">
              {title}
            </h2>
            {statusBadge}
          </div>
        </div>

        {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
      </div>

      {/* Main Content (Scrollable Responsive Grid) */}
      <div className="flex-1 overflow-y-auto px-3 pb-24 sm:px-6 md:px-8 md:pb-8 pt-3 sm:pt-1.5 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
        {/* Left Column (Main Form / Content) */}
        <div className="flex-1 w-full flex flex-col gap-4 sm:gap-6">{leftColumn}</div>

        {/* Right Column (Sidebar / Metadata Cards) */}
        {rightColumn && <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 sm:gap-6">{rightColumn}</div>}
      </div>

      {/* Floating Sticky Save/Discard Bar */}
      {onSave && (
        <div
          className={cn(
            "fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-xl shadow-2xl border border-border/80 backdrop-blur-md flex flex-row items-center justify-between gap-3 sm:gap-6 w-[calc(100%-1.5rem)] sm:w-auto max-w-lg transition-all duration-300",
            hasChanges ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-8 pointer-events-none"
          )}
        >
          <div className="flex flex-col gap-0.5 select-none min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">Unsaved changes</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">You have unsaved changes.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onDiscard && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs cursor-pointer px-3"
                onClick={onDiscard}
                disabled={isSaving}
              >
                Discard
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 text-xs bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer px-4 inline-flex items-center gap-1.5"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : saveLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
