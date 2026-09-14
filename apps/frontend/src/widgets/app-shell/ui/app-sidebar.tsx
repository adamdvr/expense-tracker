'use client'

import { Wallet } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { User } from '@/entities/user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/shared/ui/sidebar'
import { isNavigationItemActive, NAVIGATION_ITEMS } from '../config/navigation'
import { SidebarUser } from './sidebar-user'

export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  // На мобильных меню открыто поверх контента (sheet) — закрываем его после перехода.
  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Трекер расходов"
              render={<Link href="/" onClick={handleNavigate} />}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Wallet className="size-4" />
              </span>
              <span className="truncate font-semibold">Трекер расходов</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Меню</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAVIGATION_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isNavigationItemActive(item, pathname)}
                    tooltip={item.title}
                    render={<Link href={item.href} onClick={handleNavigate} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
