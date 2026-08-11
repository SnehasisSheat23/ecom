import { BlogsView } from "@/components/blogs-view"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col bg-background/50 min-h-0">
      <div className="@container/main flex flex-1 flex-col gap-2 min-h-0">
        <BlogsView />
      </div>
    </div>
  )
}
