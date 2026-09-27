"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, LayoutGrid, ShoppingBag, Users, Menu } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  {
    title: "Products",
    href: "/dashboard/products",
    icon: Package,
    matchExact: false,
  },
  {
    title: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingBag,
    matchExact: false,
  },
  {
    title: "Categories",
    href: "/dashboard/categories",
    icon: LayoutGrid,
    matchExact: false,
  },
  {
    title: "Customers",
    href: "/dashboard/customers",
    icon: Users,
    matchExact: false,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { toggleSidebar, openMobile } = useSidebar()

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-card/95 backdrop-blur-md border-t border-border/60 items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
      {NAV_ITEMS.map((item) => {
        const IconComponent = item.icon
        const isActive = pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 select-none transition-colors",
              isActive
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground font-medium"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-xl transition-all",
                isActive && "bg-muted/80 text-foreground"
              )}
            >
              <IconComponent className="size-5" />
            </div>
            <span className="text-[10.5px] leading-none tracking-tight">{item.title}</span>
          </Link>
        )
      })}

      {/* Menu / Drawer Toggle */}
      <button
        type="button"
        onClick={() => toggleSidebar()}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 select-none transition-colors cursor-pointer",
          openMobile
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground font-medium"
        )}
        aria-label="Open navigation menu"
      >
        <div
          className={cn(
            "p-1 rounded-xl transition-all",
            openMobile && "bg-muted/80 text-foreground"
          )}
        >
          <Menu className="size-5" />
        </div>
        <span className="text-[10.5px] leading-none tracking-tight">More</span>
      </button>
    </nav>
  )
}
