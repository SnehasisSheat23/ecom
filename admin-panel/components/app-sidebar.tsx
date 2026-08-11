"use client"

import * as React from "react"
import Link from "next/link"

import { apiRequest } from "@/lib/api-client"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Icon } from "@/components/ui/icon"

const data = {
  user: {
    name: "Abdullah Bakheet Admin",
    email: "admin@abdullahbakheet.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Products",
      url: "/dashboard/products",
      icon: (
        <Icon name="inventory_2" />
      ),
      items: [
        {
          title: "All Products",
          url: "/dashboard/products",
        },
      ],
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
      title: "Customers",
      url: "/dashboard/customers",
      icon: (
        <Icon name="group" />
      ),
    },
    {
      title: "Blog posts",
      url: "/dashboard/blogs",
      icon: (
        <Icon name="article" />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [currentUser, setCurrentUser] = React.useState(data.user)
  const [navItems, setNavItems] = React.useState(data.navMain)

  React.useEffect(() => {
    const session = localStorage.getItem("user_session")
    if (session) {
      try {
        const parsed = JSON.parse(session)
        // Defer user profile state update to prevent synchronous cascading renders inside effect
        setTimeout(() => {
          setCurrentUser({
            name: parsed.name || parsed.email.split("@")[0],
            email: parsed.email,
            avatar: parsed.avatar || "",
          })
        }, 0)
      } catch (e) {
        console.error("Failed to parse user session", e)
      }
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true
    async function fetchProductTypes() {
      try {
        const res = await apiRequest("/product-types")
        if (res.ok) {
          const body = await res.json()
          const types: Array<{ id: string; name: string; slug: string }> = body.data?.items || []
          if (types.length > 0 && isMounted) {
            setNavItems((prevItems) =>
              prevItems.map((item) => {
                if (item.title === "Products") {
                  return {
                    ...item,
                    items: [
                      { title: "All Products", url: "/dashboard/products" },
                      ...types.map((t) => ({
                        title: t.name,
                        url: `/dashboard/products?type=${encodeURIComponent(t.slug)}`,
                      })),
                    ],
                  }
                }
                return item
              })
            )
          }
        }
      } catch (e) {
        console.warn("Failed to fetch tenant product types for sidebar:", e)
      }
    }
    fetchProductTypes()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="px-5 pt-2 pb-4">
        <Link href="/products" className="flex items-center">
          <img src="/image.png" alt="Abdullah Bakheet" className="h-14 w-auto object-contain" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
