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

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="px-5 pt-2 pb-4">
        <Link href="/products" className="flex items-center">
          <img src="/image.png" alt="Abdullah Bakheet" className="h-14 w-auto object-contain" />
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
