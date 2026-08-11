"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import blogsData from "@/app/dashboard/blogs.json"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

interface BlogPost {
  id: string
  title: string
  content: string
  excerpt: string
  status: "Draft" | "Published" | "Scheduled"
  publishDate: string
  author: string
  blogCategory: string
  featuredImage: string
  tags: string[]
  seoTitle: string
  seoDescription: string
  handle: string
}

const TABS = ["All", "Published", "Drafts", "Scheduled"]

function StatusBadge({ status }: { status: string }) {
  let bgColor = "bg-muted/50"
  let textColor = "text-zinc-600 dark:text-zinc-300"
  
  if (status === "Published") {
    bgColor = "bg-emerald-100 dark:bg-emerald-900/30"
    textColor = "text-emerald-800 dark:text-emerald-400"
  } else if (status === "Draft") {
    bgColor = "bg-zinc-100 dark:bg-zinc-900/30"
    textColor = "text-zinc-800 dark:text-zinc-400"
  } else if (status === "Scheduled") {
    bgColor = "bg-blue-100 dark:bg-blue-900/30"
    textColor = "text-blue-800 dark:text-blue-400"
  }

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-[11px] ${bgColor} ${textColor}`}>
      {status}
    </div>
  )
}

export function BlogsView() {
  const [blogs, setBlogs] = React.useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("All")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const router = useRouter()

  // Search & Sort States
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearchVisible, setIsSearchVisible] = React.useState(false)
  const [sortField, setSortField] = React.useState<keyof BlogPost>("title")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setBlogs(blogsData as BlogPost[])
      setIsLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  // Dynamic Filtering & Sorting Logic
  const filteredBlogs = React.useMemo(() => {
    let result = [...blogs]

    // 1. Tab Segment Filtering
    if (activeTab === "Published") {
      result = result.filter(b => b.status === "Published")
    } else if (activeTab === "Drafts") {
      result = result.filter(b => b.status === "Draft")
    } else if (activeTab === "Scheduled") {
      result = result.filter(b => b.status === "Scheduled")
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(b => {
        return b.title.toLowerCase().includes(query) || 
               b.author.toLowerCase().includes(query) ||
               b.blogCategory.toLowerCase().includes(query)
      })
    }

    // 3. Sorting Logic
    result.sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]

      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return sortOrder === "asc" ? -1 : 1
      if (valA > valB) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [blogs, activeTab, searchQuery, sortField, sortOrder])

  // Row Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredBlogs.map(b => b.id)
      setSelectedRows(new Set(allFilteredIds))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (blogId: string, checked: boolean) => {
    const newSelection = new Set(selectedRows)
    if (checked) {
      newSelection.add(blogId)
    } else {
      newSelection.delete(blogId)
    }
    setSelectedRows(newSelection)
  }

  const toggleSort = (field: keyof BlogPost) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: keyof BlogPost) => {
    if (sortField !== field) {
      return <Icon name="swap_vert" size={14} className="size-3.5! text-muted-foreground opacity-30 hover:opacity-100 transition-opacity ml-0.5" />
    }
    return sortOrder === "asc"
      ? <Icon name="arrow_upward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5" />
      : <Icon name="arrow_downward" size={14} className="size-3.5! text-foreground font-semibold ml-0.5" />
  }

  // Bulk Actions
  const handleBulkDelete = () => {
    setBlogs(prev => prev.filter(b => !selectedRows.has(b.id)))
    setSelectedRows(new Set())
  }

  const handleBulkStatusChange = (status: "Published" | "Draft") => {
    setBlogs(prev => prev.map(b => selectedRows.has(b.id) ? { ...b, status } : b))
    setSelectedRows(new Set())
  }

  const handleAddBlog = () => {
    const newId = `BLOG-00${blogs.length + 1}`
    const newBlog: BlogPost = {
      id: newId,
      title: "Untitled Blog Post",
      content: "",
      excerpt: "",
      status: "Draft",
      publishDate: new Date().toISOString(),
      author: "Admin Staff",
      blogCategory: "News",
      featuredImage: "",
      tags: [],
      seoTitle: "Untitled Blog Post",
      seoDescription: "",
      handle: `untitled-blog-post-${blogs.length + 1}`
    }
    setBlogs(prev => [newBlog, ...prev])
    router.push(`/dashboard/blogs/${newId}`)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 lg:px-6 lg:pt-6 pb-0 max-w-full h-full min-h-0 font-ui animate-in fade-in duration-300">
      
      {/* Header section with title and actions */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground select-none">Blog posts</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 shadow-xs text-xs px-3 cursor-pointer">Export</Button>
          <Button variant="outline" className="h-8 shadow-xs text-xs px-3 cursor-pointer">Import</Button>
          <Button 
            className="h-8 shadow-xs text-xs px-4 bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer"
            onClick={handleAddBlog}
          >
            Add blog post
          </Button>
        </div>
      </div>

      {/* Blogs Table Container */}
      <div className="border border-border/80 border-b-0 rounded-t-lg rounded-b-none overflow-hidden bg-card/40 shadow-xs flex flex-col flex-1 min-h-0 mt-2">
        
        {/* Toolbar & Filters */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-2 h-12 shrink-0">
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
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-border/60 ml-auto shrink-0">
            {isSearchVisible ? (
              <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2 w-48 md:w-60 animate-in fade-in zoom-in-95 duration-200">
                <Icon name="search" size={14} className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search blogs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none focus:outline-none text-xs text-foreground placeholder:text-muted-foreground w-full h-full pl-1 ml-0.5 shrink min-w-0"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0 flex items-center justify-center">
                    <Icon name="close" size={12} className="size-3 text-muted-foreground" />
                  </button>
                )}
                <button 
                  onClick={() => { setIsSearchVisible(false); setSearchQuery(""); }} 
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-background shadow-xs cursor-pointer">
                  <Icon name="swap_vert" size={16} className="size-4! text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-ui">
                <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortField} onValueChange={(val) => setSortField(val as keyof BlogPost)}>
                  <DropdownMenuRadioItem value="title" className="text-xs">Title</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="author" className="text-xs">Author</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="blogCategory" className="text-xs">Category</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="publishDate" className="text-xs">Date</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOrder} onValueChange={(val) => setSortOrder(val as "asc" | "desc")}>
                  <DropdownMenuRadioItem value="asc" className="text-xs">Ascending</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="desc" className="text-xs">Descending</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selected Rows Bulk Actions Bar Overlay */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-2 bg-background border-b border-border/60 text-foreground px-4 h-12 shrink-0 animate-in slide-in-from-top-4 duration-300">
            <span className="text-xs font-medium mr-2 text-muted-foreground">{selectedRows.size} selected</span>
            <Button 
              variant="ghost" 
              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setSelectedRows(new Set())}
            >
              Cancel
            </Button>
            <Button 
              variant="ghost" 
              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => handleBulkStatusChange("Published")}
            >
              Publish
            </Button>
            <Button 
              variant="ghost" 
              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => handleBulkStatusChange("Draft")}
            >
              Make Draft
            </Button>
            <Button 
              variant="ghost" 
              className="h-8 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer ml-auto font-semibold"
              onClick={handleBulkDelete}
            >
              Delete
            </Button>
          </div>
        )}

        {/* Table Body */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full border-collapse text-left text-sm relative font-ui">
            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground text-[11px] font-medium uppercase sticky top-0 z-10 backdrop-blur-xs select-none">
              <tr>
                <th className="w-10 p-3 text-center">
                  <Checkbox
                    checked={selectedRows.size === filteredBlogs.length && filteredBlogs.length > 0}
                    onCheckedChange={(val) => handleSelectAll(!!val)}
                  />
                </th>
                <th className="p-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("title")}>
                  <div className="flex items-center">
                    Blog Post Title {renderSortIcon("title")}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("author")}>
                  <div className="flex items-center">
                    Author {renderSortIcon("author")}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("blogCategory")}>
                  <div className="flex items-center">
                    Category {renderSortIcon("blogCategory")}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("publishDate")}>
                  <div className="flex items-center">
                    Date {renderSortIcon("publishDate")}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("status")}>
                  <div className="flex items-center">
                    Status {renderSortIcon("status")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="h-[49px] animate-pulse">
                    <td className="p-3 text-center">
                      <div className="size-4 bg-muted/60 rounded mx-auto" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-48 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-24 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-16 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-2.5 w-24 bg-muted/60 rounded-full" />
                    </td>
                    <td className="p-3">
                      <div className="h-5 w-16 bg-muted/60 rounded-full" />
                    </td>
                  </tr>
                ))
              ) : filteredBlogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name="article" size={24} className="size-8 text-muted-foreground/60" />
                      <span className="text-sm font-medium">No blog posts found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBlogs.map((blog) => {
                  const isChecked = selectedRows.has(blog.id)
                  return (
                    <tr
                      key={blog.id}
                      className={`hover:bg-muted/30 cursor-pointer duration-150 text-[13px] ${
                        isChecked ? "bg-muted/40" : "bg-card/20"
                      }`}
                      onClick={() => router.push(`/dashboard/blogs/${blog.id}`)}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(val) => handleSelectRow(blog.id, !!val)}
                        />
                      </td>
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        {blog.title}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {blog.author}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {blog.blogCategory}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(blog.publishDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={blog.status} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
