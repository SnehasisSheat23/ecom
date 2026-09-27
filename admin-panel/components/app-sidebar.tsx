"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import {
  Package,
  LayoutGrid,
  ShoppingBag,
  FileText,
  Users,
  Building2,
  Truck,
} from "lucide-react"

import { apiRequest } from "@/lib/api-client"

const data = {
  user: {
    name: "Admin User",
    email: "admin@example.com",
    avatar: "/footer_logo.png",
  },
  navMain: [
    {
      title: "Products",
      url: "/dashboard/products",
      icon: <Package className="size-4" />,
    },
    {
      title: "Category",
      url: "/dashboard/categories",
      icon: <LayoutGrid className="size-4" />,
    },
    {
      title: "Orders",
      url: "/dashboard/orders",
      icon: <ShoppingBag className="size-4" />,
    },
    {
      title: "Quotations",
      url: "/dashboard/quotations",
      icon: <FileText className="size-4" />,
    },
    {
      title: "Customers",
      url: "/dashboard/customers",
      icon: <Users className="size-4" />,
    },
    {
      title: "Business",
      url: "/dashboard/customers/corporate",
      icon: <Building2 className="size-4" />,
    },
    {
      title: "Shipping",
      url: "/dashboard/shipping",
      icon: <Truck className="size-4" />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [currentUser, setCurrentUser] = React.useState(data.user)

  React.useEffect(() => {
    const session = localStorage.getItem("user_session")
    if (session) {
      try {
        const parsed = JSON.parse(session)
        setCurrentUser({
          name: parsed.name || parsed.email?.split("@")[0] || "Admin User",
          email: parsed.email || "admin@example.com",
          avatar: parsed.avatar || "/footer_logo.png",
        })
      } catch (e) {
        console.error("Failed to parse user session", e)
      }
    }

    // Dynamically fetch live admin profile from backend
    apiRequest("/auth/admin/me")
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error("Not logged in")
      })
      .then((json) => {
        if (json.data) {
          const u = json.data
          const displayName = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email?.split("@")[0] || "Admin User"
          const avatarUrl = u.avatar || u.image || "/footer_logo.png"
          setCurrentUser({
            name: displayName,
            email: u.email,
            avatar: avatarUrl,
          })
          localStorage.setItem(
            "user_session",
            JSON.stringify({
              id: u.id,
              email: u.email,
              name: displayName,
              avatar: avatarUrl,
              role: u.role || "admin",
              isAdmin: true,
            })
          )
        }
      })
      .catch(() => {})
  }, [])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="px-4 pt-2 pb-2">
        <Link href="/products" className="flex items-center">
          <img src="/image.png" alt="Abdullah Bakheet" className="h-12 w-auto object-contain" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
