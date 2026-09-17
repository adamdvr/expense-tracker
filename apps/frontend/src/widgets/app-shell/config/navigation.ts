import { ArrowLeftRight, LayoutDashboard, Tags, type LucideIcon } from 'lucide-react'

export interface NavigationItem {
  title: string
  href: string
  icon: LucideIcon
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { title: 'Главная', href: '/', icon: LayoutDashboard },
  { title: 'Транзакции', href: '/transactions', icon: ArrowLeftRight },
  { title: 'Категории', href: '/categories', icon: Tags },
]

export function isNavigationItemActive(item: NavigationItem, pathname: string): boolean {
  if (pathname === item.href) {
    return true
  }
  // Вложенные страницы раздела (`/transactions/123`), но не соседние пути (`/transactions-archive`).
  return item.href !== '/' && pathname.startsWith(`${item.href}/`)
}
