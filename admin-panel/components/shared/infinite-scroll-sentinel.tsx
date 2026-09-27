"use client"

import * as React from "react"

export interface InfiniteScrollSentinelProps {
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  label?: string
  asTableRow?: boolean
  colSpan?: number
}

export function InfiniteScrollSentinel({
  hasMore,
  isLoadingMore,
  onLoadMore,
  label = "items",
  asTableRow = false,
  colSpan = 1,
}: InfiniteScrollSentinelProps) {
  const sentinelRef = React.useRef<HTMLDivElement | HTMLTableRowElement | null>(null)

  React.useEffect(() => {
    if (!hasMore || !onLoadMore || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: "250px" }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [hasMore, onLoadMore, isLoadingMore])

  if (!hasMore && !isLoadingMore) return null

  const content = (
    <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground select-none">
      {isLoadingMore ? (
        <>
          <div className="size-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Loading more {label}...</span>
        </>
      ) : (
        <button
          type="button"
          onClick={onLoadMore}
          className="text-xs text-primary hover:underline font-medium cursor-pointer"
        >
          Load more {label}
        </button>
      )}
    </div>
  )

  if (asTableRow) {
    return (
      <tr ref={sentinelRef as React.RefObject<HTMLTableRowElement>}>
        <td colSpan={colSpan} className="text-center p-0">
          {content}
        </td>
      </tr>
    )
  }

  return (
    <div ref={sentinelRef as React.RefObject<HTMLDivElement>}>
      {content}
    </div>
  )
}

export function InfiniteScrollFooter({
  loadedCount,
  totalCount,
  label = "items",
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  loadedCount: number
  totalCount?: number
  label?: string
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
}) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 bg-card/60 text-xs text-muted-foreground shrink-0 font-ui select-none">
      <div>
        Showing <span className="font-semibold text-foreground">{loadedCount}</span>
        {typeof totalCount === "number" && totalCount > 0 ? (
          <> of <span className="font-semibold text-foreground">{totalCount}</span></>
        ) : null}{" "}
        {label}
      </div>
      <div>
        {hasMore ? (
          isLoadingMore ? (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <div className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading...
            </span>
          ) : (
            <button
              type="button"
              onClick={onLoadMore}
              className="hover:underline text-primary cursor-pointer font-medium"
            >
              Load more
            </button>
          )
        ) : (
          <span className="text-[11px] text-muted-foreground/75 font-medium">All {label} loaded</span>
        )}
      </div>
    </div>
  )
}
