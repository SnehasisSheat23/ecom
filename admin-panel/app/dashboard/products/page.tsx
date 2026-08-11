import { Suspense } from "react"
import { ProductsView } from "@/components/products-view"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col bg-background/50 min-h-0">
      <div className="@container/main flex flex-1 flex-col gap-2 min-h-0">
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading products...</div>}>
          <ProductsView />
        </Suspense>
      </div>
    </div>
  )
}
