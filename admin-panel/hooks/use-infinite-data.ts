"use client"

import * as React from "react"

export interface InfiniteDataResponse<T, M = any> {
  items: T[]
  total?: number
  hasMore?: boolean
  meta?: M
}

export interface UseInfiniteDataOptions<T, M = any> {
  fetcher: (page: number, limit: number) => Promise<InfiniteDataResponse<T, M>>
  pageSize?: number
  deps?: any[]
  enabled?: boolean
}

export function useInfiniteData<T, M = any>({
  fetcher,
  pageSize = 20,
  deps = [],
  enabled = true,
}: UseInfiniteDataOptions<T, M>) {
  const [items, setItems] = React.useState<T[]>([])
  const [page, setPage] = React.useState(1)
  const [totalItems, setTotalItems] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [meta, setMeta] = React.useState<M | undefined>(undefined)

  // Stable ref for fetcher to prevent stale closures or infinite loops
  const fetcherRef = React.useRef(fetcher)
  fetcherRef.current = fetcher

  // Reset and load page 1 whenever deps change
  React.useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setIsLoading(true)
    setPage(1)

    async function loadFirstPage() {
      try {
        const res = await fetcherRef.current(1, pageSize)
        if (cancelled) return

        const fetchedItems = res.items || []
        const total = typeof res.total === "number" ? res.total : fetchedItems.length
        const more = typeof res.hasMore === "boolean" 
          ? res.hasMore 
          : (typeof res.total === "number" ? fetchedItems.length < total : fetchedItems.length === pageSize)

        setItems(fetchedItems)
        setTotalItems(total)
        setHasMore(more)
        if (res.meta !== undefined) {
          setMeta(res.meta)
        }
      } catch (err) {
        if (!cancelled) {
          console.error("useInfiniteData error loading page 1:", err)
          setItems([])
          setHasMore(false)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadFirstPage()

    return () => {
      cancelled = true
    }
  }, [...deps, enabled, pageSize])

  // Load next page
  const loadMore = React.useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    const nextPage = page + 1

    try {
      const res = await fetcherRef.current(nextPage, pageSize)
      const newItems = res.items || []
      const total = typeof res.total === "number" ? res.total : totalItems
      const more = typeof res.hasMore === "boolean"
        ? res.hasMore
        : (typeof res.total === "number" ? (items.length + newItems.length < total) : newItems.length === pageSize)

      setItems((prev) => [...prev, ...newItems])
      setPage(nextPage)
      setTotalItems(total)
      setHasMore(more)
      if (res.meta !== undefined) {
        setMeta(res.meta)
      }
    } catch (err) {
      console.error(`useInfiniteData error loading page ${nextPage}:`, err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoading, isLoadingMore, hasMore, page, pageSize, totalItems, items.length])

  // Refresh from page 1
  const refresh = React.useCallback(async () => {
    setIsLoading(true)
    setPage(1)
    try {
      const res = await fetcherRef.current(1, pageSize)
      const fetchedItems = res.items || []
      const total = typeof res.total === "number" ? res.total : fetchedItems.length
      const more = typeof res.hasMore === "boolean"
        ? res.hasMore
        : (typeof res.total === "number" ? fetchedItems.length < total : fetchedItems.length === pageSize)

      setItems(fetchedItems)
      setTotalItems(total)
      setHasMore(more)
      if (res.meta !== undefined) {
        setMeta(res.meta)
      }
    } catch (err) {
      console.error("useInfiniteData refresh error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [pageSize])

  const mutate = React.useCallback((updater: (prev: T[]) => T[]) => {
    setItems((prev) => updater(prev))
  }, [])

  return {
    items,
    totalItems,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMore,
    refresh,
    mutate,
    meta,
    page,
    pageSize,
  }
}
