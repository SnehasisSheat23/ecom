"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  const pathname = usePathname()
  
  let pageTitle = "Dashboard"
  if (pathname?.includes("/orders")) {
    pageTitle = "Orders"
  } else if (pathname?.includes("/products")) {
    pageTitle = "Products"
  } else if (pathname?.includes("/customers")) {
    pageTitle = "Customers"
  } else if (pathname?.includes("/blogs")) {
    pageTitle = "Blog posts"
  } else if (pathname?.includes("/documents")) {
    pageTitle = "Documents"
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium font-heading">{pageTitle}</h1>
      </div>
    </header>
  )
}
