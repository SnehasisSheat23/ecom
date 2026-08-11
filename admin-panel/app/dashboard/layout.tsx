"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const session = localStorage.getItem("user_session")
    if (!session) {
      router.push("/")
    } else {
      // Defer state update to next event loop cycle to avoid synchronous cascading renders warning
      const timer = setTimeout(() => {
        setIsAuthenticated(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [router])

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-transparent dark:border-zinc-200" />
          <span className="text-xs text-muted-foreground font-ui">Verifying session...</span>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh md:h-[calc(100svh-0.5rem)] overflow-hidden flex flex-col">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
