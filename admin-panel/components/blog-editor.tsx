"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import blogsData from "@/app/dashboard/blogs.json"

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
  commentsSetting: "disabled" | "moderated" | "allowed"
}

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

export function BlogEditor({ id }: { id: string }) {
  const router = useRouter()
  const [blog, setBlog] = React.useState<BlogPost | null>(null)
  const [initialBlog, setInitialBlog] = React.useState<BlogPost | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [showToast, setShowToast] = React.useState(false)

  // AI Generation State
  const [isGenerating, setIsGenerating] = React.useState(false)

  // Preview Modal State
  const [showPreview, setShowPreview] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const matched = (blogsData as BlogPost[]).find(b => b.id === id)
      if (matched) {
        setBlog(JSON.parse(JSON.stringify(matched)))
        setInitialBlog(JSON.parse(JSON.stringify(matched)))
      }
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [id])

  const hasChanges = React.useMemo(() => {
    if (!blog || !initialBlog) return false
    return JSON.stringify(blog) !== JSON.stringify(initialBlog)
  }, [blog, initialBlog])

  const handleSave = () => {
    if (!blog) return
    setInitialBlog(JSON.parse(JSON.stringify(blog)))
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  const handleDiscard = () => {
    if (!initialBlog) return
    setBlog(JSON.parse(JSON.stringify(initialBlog)))
  }

  // Simulated AI content writer
  const handleGenerateAI = () => {
    if (!blog || !blog.title.trim()) return
    setIsGenerating(true)
    setTimeout(() => {
      const topic = blog.title
      const aiContent = `<h1>${topic}</h1>
<p>When discussing <strong>${topic.toLowerCase()}</strong>, it becomes immediately clear that quality, timing, and deliberate attention to detail are what separate ordinary results from extraordinary ones. Whether you are a season expert or just getting started, focusing on core fundamentals is key.</p>
<h2>Why It Matters Today</h2>
<p>Modern workflows and lifestyle demands have highlighted the need for efficiency and craftsmanship. Sourcing high-quality input elements and refining processing systems ensures your deliverables withstand the test of time, reducing waste and boosting sustainable quality.</p>
<h2>Key Takeaways & Checklist</h2>
<ul>
  <li><strong>Meticulous Sourcing:</strong> Always seek verified, premium baseline inputs.</li>
  <li><strong>Eco-Minded Process:</strong> Reduce overhead footprints while optimizing output.</li>
  <li><strong>Enduring Design:</strong> Avoid temporary fads; prioritize structural longevity.</li>
</ul>
<p>We are constantly seeking to perfect these structures. Explore the full range today, and share your suggestions in the comments section below!</p>`

      setBlog(prev => prev ? { ...prev, content: aiContent } : null)
      setIsGenerating(false)
    }, 1200)
  }

  // Helper to generate handle from title automatically
  const handleTitleChange = (val: string) => {
    if (!blog) return
    const generatedHandle = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
    
    setBlog(prev => {
      if (!prev) return null
      // Only update seoTitle and handle if they haven't been customized separately or are matching initial title
      const isSeoTitleUntouched = prev.seoTitle === prev.title || !prev.seoTitle
      const isHandleUntouched = prev.handle === prev.title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") || !prev.handle
      
      return {
        ...prev,
        title: val,
        seoTitle: isSeoTitleUntouched ? val : prev.seoTitle,
        handle: isHandleUntouched ? generatedHandle : prev.handle
      }
    })
  }

  // Calculate dynamic reading time based on content word count
  const readingTime = React.useMemo(() => {
    if (!blog || !blog.content) return "1 min read"
    const text = blog.content.replace(/<[^>]*>/g, "") // strip html tags
    const words = text.trim().split(/\s+/).length
    const minutes = Math.max(1, Math.ceil(words / 220)) // average reading speed
    return `${minutes} min read`
  }, [blog?.content])

  if (isLoading) {
    return (
      <div className="flex flex-col h-full font-ui min-h-0">
        <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center gap-3.5 shrink-0">
          <div className="size-8 rounded-lg bg-muted/30 animate-pulse" />
          <div className="h-6 w-32 bg-muted/30 animate-pulse rounded" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-1.5 flex flex-col lg:flex-row gap-6 items-start animate-pulse">
          <div className="flex-1 w-full flex flex-col gap-6">
            <Card className="w-full">
              <CardContent className="h-60 bg-muted/10 rounded-lg mt-6" />
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!blog) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 font-ui">
        <div className="text-center max-w-sm flex flex-col items-center gap-3">
          <div className="p-3 bg-muted/40 rounded-full">
            <Icon name="article" className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Blog Post Not Found</h2>
          <p className="text-sm text-muted-foreground leading-normal">
            The blog post with ID "{id}" could not be found in your store records.
          </p>
          <Link href="/dashboard/blogs" className="mt-2">
            <Button size="sm" className="cursor-pointer">Back to Blog posts</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full font-ui min-h-0 relative">
      {/* Top Header */}
      <div className="bg-background/95 pt-6 pb-2.5 px-6 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard/blogs"
            className="text-muted-foreground hover:text-foreground duration-200 flex items-center justify-center size-8 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <Icon name="arrow_back" className="size-5 text-[20px]" />
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-heading text-foreground tracking-tight leading-none">
              {blog.title || "Untitled Post"}
            </h2>
            <StatusBadge status={blog.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 shadow-xs cursor-pointer gap-1.5"
            onClick={() => setShowPreview(true)}
          >
            <Icon name="visibility" className="size-4" />
            Preview
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 shadow-xs cursor-pointer"
            disabled={!hasChanges}
            onClick={handleDiscard}
          >
            Discard
          </Button>
          <Button 
            size="sm" 
            className="h-8 shadow-xs bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer"
            disabled={!hasChanges}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Content Form Scroll Container */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-1.5 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column (Main Editor Cards) */}
        <div className="flex-1 w-full flex flex-col gap-6">
          
          {/* Post Title & Rich Text Content */}
          <Card>
            <CardContent className="pt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-foreground">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sustainable Denim is the Future"
                  className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={blog.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-foreground">Content</label>
                <RichTextEditor
                  value={blog.content}
                  onChange={(html) => setBlog(prev => prev ? { ...prev, content: html } : null)}
                  onGenerateAI={handleGenerateAI}
                  isGenerating={isGenerating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Excerpt Card */}
          <Card>
            <CardContent className="pt-6 flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-foreground">Excerpt</label>
              <textarea
                placeholder="Write a brief summary of this post for your homepage or blog feed..."
                className="min-h-20 w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                value={blog.excerpt}
                onChange={(e) => setBlog(prev => prev ? { ...prev, excerpt: e.target.value } : null)}
              />
              <span className="text-xs text-muted-foreground">Excerpts are displayed on your blog index grid to hook readers in.</span>
            </CardContent>
          </Card>

          {/* Live SEO Listing Preview & Inputs */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Search engine listing preview</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Add a title and description to see how this blog post might appear in search engine listings.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-5">
              
              {/* Visual Preview */}
              <div className="border border-border/60 bg-muted/15 rounded-lg p-4 flex flex-col gap-1 select-none">
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer break-words">
                  {blog.seoTitle || blog.title || "Untitled Blog Post"}
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-500 break-all font-mono leading-none">
                  https://yourstore.com/blogs/{blog.blogCategory.toLowerCase() || "news"}/{blog.handle || "untitled-post"}
                </span>
                <span className="text-xs text-muted-foreground leading-normal mt-0.5 max-w-xl break-words">
                  {blog.seoDescription || blog.excerpt || "No SEO description set yet. Search engines will pull from your article body if left blank."}
                </span>
              </div>

              <Separator className="bg-border/60" />

              {/* Form inputs for SEO */}
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[13px] font-medium text-foreground">Page title</label>
                    <span className="text-[10px] text-muted-foreground font-mono">{(blog.seoTitle || "").length} / 70 characters</span>
                  </div>
                  <input
                    type="text"
                    maxLength={70}
                    className="w-full h-9 px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={blog.seoTitle}
                    onChange={(e) => setBlog(prev => prev ? { ...prev, seoTitle: e.target.value } : null)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[13px] font-medium text-foreground">Meta description</label>
                    <span className="text-[10px] text-muted-foreground font-mono">{(blog.seoDescription || "").length} / 320 characters</span>
                  </div>
                  <textarea
                    maxLength={320}
                    className="min-h-20 w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                    value={blog.seoDescription}
                    onChange={(e) => setBlog(prev => prev ? { ...prev, seoDescription: e.target.value } : null)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground">URL handle</label>
                  <div className="flex items-center rounded-md border border-border/60 overflow-hidden bg-background h-9 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
                    <span className="bg-muted px-3 text-xs text-muted-foreground h-full flex items-center border-r border-border/60 select-none">
                      /blogs/{blog.blogCategory.toLowerCase() || "news"}/
                    </span>
                    <input
                      type="text"
                      className="w-full h-full px-3 text-sm bg-transparent border-none outline-none focus:outline-none"
                      value={blog.handle}
                      onChange={(e) => setBlog(prev => prev ? { ...prev, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : null)}
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Right Column (Sidebar Settings Cards) */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
          
          {/* Status Settings Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Publishing status</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground">Status</label>
                <div className="relative">
                  <select
                    className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md font-medium appearance-none pr-8 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={blog.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as "Draft" | "Published" | "Scheduled"
                      setBlog(prev => prev ? { 
                        ...prev, 
                        status: nextStatus,
                        publishDate: nextStatus === "Published" ? new Date().toISOString() : prev.publishDate
                      } : null)
                    }}
                  >
                    <option value="Published">Published</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Draft">Draft</option>
                  </select>
                  <Icon name="expand_more" className="text-muted-foreground size-4! absolute right-2.5 top-2 pointer-events-none" />
                </div>
              </div>

              {blog.status === "Scheduled" && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-[12px] font-medium text-foreground">Schedule date</label>
                  <input
                    type="datetime-local"
                    className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={blog.publishDate ? blog.publishDate.substring(0, 16) : ""}
                    onChange={(e) => setBlog(prev => prev ? { ...prev, publishDate: new Date(e.target.value).toISOString() } : null)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Author & Blog Category */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Organization</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground">Author</label>
                <input
                  type="text"
                  className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={blog.author}
                  onChange={(e) => setBlog(prev => prev ? { ...prev, author: e.target.value } : null)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground">Blog Feed Category</label>
                <div className="relative">
                  <select
                    className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md font-medium appearance-none pr-8 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={blog.blogCategory}
                    onChange={(e) => setBlog(prev => prev ? { ...prev, blogCategory: e.target.value } : null)}
                  >
                    <option value="News">News</option>
                    <option value="Guides">Guides</option>
                    <option value="Announcements">Announcements</option>
                    <option value="Updates">Updates</option>
                  </select>
                  <Icon name="expand_more" className="text-muted-foreground size-4! absolute right-2.5 top-2 pointer-events-none" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Setting Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Comments</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3 text-sm font-ui">
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="comments"
                    className="size-4 rounded-full border-border cursor-pointer mt-0.5"
                    checked={blog.commentsSetting === "disabled"}
                    onChange={() => setBlog(prev => prev ? { ...prev, commentsSetting: "disabled" } : null)}
                  />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">Comments are disabled</span>
                    <span className="text-[11px] text-muted-foreground leading-normal mt-0.5">Readers won't be able to submit comments on this post.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="comments"
                    className="size-4 rounded-full border-border cursor-pointer mt-0.5"
                    checked={blog.commentsSetting === "moderated"}
                    onChange={() => setBlog(prev => prev ? { ...prev, commentsSetting: "moderated" } : null)}
                  />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">Moderated comments</span>
                    <span className="text-[11px] text-muted-foreground leading-normal mt-0.5">Comments are held for review before being published.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="comments"
                    className="size-4 rounded-full border-border cursor-pointer mt-0.5"
                    checked={blog.commentsSetting === "allowed"}
                    onChange={() => setBlog(prev => prev ? { ...prev, commentsSetting: "allowed" } : null)}
                  />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">Auto-publish comments</span>
                    <span className="text-[11px] text-muted-foreground leading-normal mt-0.5">Comments are automatically approved and displayed.</span>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Featured Image URL & Preview */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Featured image</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3 text-sm font-ui">
              {blog.featuredImage ? (
                <div className="border border-border/60 rounded-lg overflow-hidden bg-muted/20 relative group select-none">
                  <Image
                    src={blog.featuredImage}
                    alt="Featured Blog Preview"
                    width={500}
                    height={128}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="size-7 h-7 w-7 rounded-full cursor-pointer"
                      onClick={() => setBlog(prev => prev ? { ...prev, featuredImage: "" } : null)}
                    >
                      <Icon name="delete" className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border/80 rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground/80 gap-1.5 select-none">
                  <Icon name="add_photo_alternate" className="size-8 text-muted-foreground/40" />
                  <span className="text-[11px] font-medium text-center">No image added</span>
                </div>
              )}
              
              <div className="flex flex-col gap-1.5 mt-1.5">
                <label className="text-[11px] font-medium text-foreground">Image URL</label>
                <input
                  type="text"
                  placeholder="https://unsplash.com/... or /images/..."
                  className="w-full h-8 px-2.5 py-1 text-xs bg-background border border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={blog.featuredImage}
                  onChange={(e) => setBlog(prev => prev ? { ...prev, featuredImage: e.target.value } : null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tag Manager Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold font-heading text-foreground">Tags</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {blog.tags && blog.tags.map((tag, idx) => (
                  <div key={idx} className="bg-muted px-2 py-0.5 rounded-md text-xs font-medium text-foreground flex items-center gap-1.5 select-none animate-in duration-200">
                    {tag}
                    <Icon 
                      name="close" 
                      className="size-3 text-muted-foreground cursor-pointer hover:text-foreground" 
                      onClick={() => {
                        setBlog(prev => {
                          if (!prev || !prev.tags) return prev
                          return {
                            ...prev,
                            tags: prev.tags.filter((_, i) => i !== idx)
                          }
                        })
                      }}
                    />
                  </div>
                ))}
                <input
                  type="text"
                  placeholder="Add tag..."
                  className="h-6 px-2 py-0.5 text-xs bg-background border border-dashed border-border/60 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-20 placeholder:text-muted-foreground/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = e.currentTarget.value.trim()
                      if (val) {
                        setBlog(prev => {
                          const tags = prev?.tags || []
                          if (tags.includes(val)) return prev
                          return prev ? { ...prev, tags: [...tags, val] } : null
                        })
                        e.currentTarget.value = ""
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Storefront Live Preview Modal Overlay */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 lg:p-10 font-ui animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold px-2.5 py-0.5 rounded-full select-none flex items-center gap-1">
                  <Icon name="visibility" className="size-3" />
                  Storefront Preview Mode
                </span>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            {/* Modal Content Scroll Container */}
            <div className="flex-1 overflow-y-auto px-8 py-8 md:px-12 md:py-10 bg-background flex flex-col gap-6">
              
              {/* Blog Metadata Category */}
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 leading-none select-none">
                {blog.blogCategory || "News"}
              </span>

              {/* Blog Title */}
              <h1 className="text-3xl md:text-4xl font-extrabold font-heading text-foreground tracking-tight leading-tight">
                {blog.title || "Untitled Blog Post"}
              </h1>

              {/* Author, Date, Reading Time */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground select-none">
                <span className="font-semibold text-foreground">{blog.author || "Acme Staff"}</span>
                <span className="text-border/60">•</span>
                <span>
                  {new Date(blog.publishDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
                <span className="text-border/60">•</span>
                <span className="flex items-center gap-1">
                  <Icon name="schedule" className="size-3.5" />
                  {readingTime}
                </span>
              </div>

              {/* Featured Image */}
              {blog.featuredImage && (
                <div className="rounded-xl overflow-hidden shadow-md max-h-96 w-full select-none shrink-0 border border-border/40">
                  <Image
                    src={blog.featuredImage}
                    alt="Featured Blog Header"
                    width={500}
                    height={128}
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}

              {/* Excerpt Summary Box */}
              {blog.excerpt && (
                <div className="border-l-4 border-zinc-400 dark:border-zinc-600 pl-4 py-1.5 italic text-muted-foreground text-base leading-relaxed bg-muted/10 pr-2 rounded-r-md">
                  {blog.excerpt}
                </div>
              )}

              {/* Article Content Area */}
              <article 
                className="prose dark:prose-invert max-w-none text-foreground leading-relaxed text-sm md:text-base md:leading-loose flex flex-col gap-4 pt-2"
                dangerouslySetInnerHTML={{ __html: blog.content || "<p className='text-muted-foreground italic'>Write something in the editor to see your post content here.</p>" }}
              />

              {/* Divider */}
              <Separator className="bg-border/60 my-6" />

              {/* Blog Comments Section */}
              <div className="flex flex-col gap-4 font-ui">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2 select-none">
                  <Icon name="chat_bubble_outline" className="size-5" />
                  Comments
                </h3>

                {blog.commentsSetting === "disabled" ? (
                  <p className="text-xs text-muted-foreground italic select-none">Comments are disabled for this blog post.</p>
                ) : (
                  <div className="flex flex-col gap-4 max-w-2xl">
                    {/* Dummy comment list */}
                    <div className="flex gap-3 border-b border-border/30 pb-3">
                      <div className="size-8 rounded-full bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 flex items-center justify-center font-bold text-xs select-none">
                        JD
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-foreground">John Doe</span>
                          <span className="text-muted-foreground/60">2 days ago</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-normal">
                          This is a fantastic and well-written article! I love the focus on organic baselines. Can't wait for the release!
                        </p>
                      </div>
                    </div>

                    {/* Comment Form Box */}
                    <div className="flex flex-col gap-3 pt-2">
                      <h4 className="text-xs font-semibold text-foreground select-none">Leave a comment</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Your Name"
                          disabled
                          className="h-8 px-2.5 text-xs bg-muted/40 border border-border/60 rounded-md focus:outline-none select-none cursor-not-allowed"
                        />
                        <input
                          type="email"
                          placeholder="Your Email"
                          disabled
                          className="h-8 px-2.5 text-xs bg-muted/40 border border-border/60 rounded-md focus:outline-none select-none cursor-not-allowed"
                        />
                      </div>
                      <textarea
                        placeholder="Write comment..."
                        disabled
                        className="min-h-16 w-full px-2.5 py-1.5 text-xs bg-muted/40 border border-border/60 rounded-md focus:outline-none resize-none select-none cursor-not-allowed"
                      />
                      <div className="flex justify-between items-center select-none">
                        <span className="text-[10px] text-muted-foreground italic">
                          {blog.commentsSetting === "moderated" ? "Comments require moderation approval." : "Comments are published automatically."}
                        </span>
                        <Button size="sm" className="h-7 text-xs px-3 cursor-not-allowed" disabled>
                          Post comment
                        </Button>
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Save Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <Icon name="check_circle" className="size-4" />
          <span className="text-sm font-medium">Blog post saved successfully</span>
        </div>
      )}
    </div>
  )
}
