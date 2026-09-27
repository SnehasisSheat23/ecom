"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const session = localStorage.getItem("user_session")
    const token = localStorage.getItem("access_token")

    if (!session || !token) {
      router.replace("/")
      setIsAuthenticated(false)
      return
    }

    // Verify token validity with backend
    import("@/lib/api-client").then(({ apiRequest }) => {
      apiRequest("/auth/admin/me")
        .then((res) => {
          if (!res.ok) {
            localStorage.removeItem("user_session")
            localStorage.removeItem("access_token")
            router.replace("/")
            setIsAuthenticated(false)
          } else {
            setIsAuthenticated(true)
          }
        })
        .catch(() => {
          setIsAuthenticated(true)
        })
    })
  }, [router])

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-transparent dark:border-zinc-200" />
          <span className="text-xs text-muted-foreground font-ui">Loading dashboard...</span>
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
      <SidebarInset className="h-svh md:h-[calc(100svh-0.5rem)] overflow-hidden flex flex-col min-w-0 pb-16 md:pb-0">
        {children}
      </SidebarInset>

      {/* Sleek Mobile Bottom Navigation */}
      <MobileBottomNav />
    </SidebarProvider>
  )
}
