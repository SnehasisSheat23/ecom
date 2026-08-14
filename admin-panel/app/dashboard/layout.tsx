"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    let session = localStorage.getItem("user_session")
    // If no session exists, auto-initialize a default dev session for easy testing
    if (!session) {
      const defaultDevSession = JSON.stringify({
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
      })
      localStorage.setItem("user_session", defaultDevSession)
    }

    const timer = setTimeout(() => {
      setIsAuthenticated(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [router])

  if (isAuthenticated === null) {
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
      <SidebarInset className="h-svh md:h-[calc(100svh-0.5rem)] overflow-hidden flex flex-col">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
