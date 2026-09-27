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
import { Icon } from "@/components/ui/icon"

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
      icon: (
        <Icon name="inventory_2" />
      ),
    },
    {
      title: "Category",
      url: "/dashboard/categories",
      icon: (
        <Icon name="category" />
      ),
    },
    {
      title: "Orders",
      url: "/dashboard/orders",
      icon: (
        <Icon name="shopping_bag" />
      ),
    },
    {
      title: "Quotations",
      url: "/dashboard/quotations",
      icon: (
        <Icon name="request_quote" />
      ),
    },
    {
      title: "Customers",
      url: "/dashboard/customers",
      icon: (
        <Icon name="group" />
      ),
    },
    {
      title: "Corporate Clients",
      url: "/dashboard/customers/corporate",
      icon: (
        <Icon name="business" />
      ),
    },
    {
      title: "Shipping",
      url: "/dashboard/shipping",
      icon: (
        <Icon name="local_shipping" />
      ),
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
