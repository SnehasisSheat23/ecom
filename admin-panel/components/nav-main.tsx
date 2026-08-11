"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Icon } from "@/components/ui/icon"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const [openItems, setOpenItems] = React.useState<Record<string, boolean>>({
    Category: true,
    Products: true,
  })

  const toggleItem = (title: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  return (
    <SidebarGroup className="pt-3">
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const hasSubItems = Boolean(item.items && item.items.length > 0)
            const isSubActive = item.items?.some((sub) => pathname === sub.url || pathname.startsWith(sub.url))
            const isActive =
              pathname === item.url ||
              (item.url !== "/dashboard" && pathname.startsWith(item.url)) ||
              Boolean(isSubActive)

            const isOpen = openItems[item.title] ?? Boolean(isSubActive)

            if (hasSubItems) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                    className="w-full justify-between group/button cursor-pointer"
                  >
                    <Link
                      href={item.url}
                      onClick={() => {
                        if (!isOpen) {
                          setOpenItems((prev) => ({ ...prev, [item.title]: true }))
                        }
                      }}
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.title}</span>
                      </div>
                      <span
                        role="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleItem(item.title)
                        }}
                        className="p-0.5 rounded-md hover:bg-muted/60 transition-colors"
                      >
                        <Icon
                          name="expand_more"
                          className={`size-4 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </Link>
                  </SidebarMenuButton>
                  {isOpen && (
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const isChildActive = pathname === subItem.url || pathname.startsWith(subItem.url)
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={isChildActive}>
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                  <Link href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
