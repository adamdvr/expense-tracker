'use client'

import { Loader2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useSession } from '@/entities/session'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/ui/sidebar'
import { isNavigationItemActive, NAVIGATION_ITEMS } from '../config/navigation'
import { AppSidebar } from './app-sidebar'

/** Каркас авторизованной части приложения: боковое меню, шапка, контент. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status, session } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  // Пока сессия не прочитана (или идёт редирект) — не рендерим контент,
  // чтобы запросы к API не ушли без токена.
  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Загрузка" />
      </div>
    )
  }

  const pageTitle =
    NAVIGATION_ITEMS.find((item) => isNavigationItemActive(item, pathname))?.title ?? ''

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-8 p-5 md:p-10">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-2" />
            <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight">{pageTitle}</h1>
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
