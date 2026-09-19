'use client'

import type { User } from '@/entities/user'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'

function getInitials(user: User): string {
  const source = user.name?.trim() || user.email
  const initials = source
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
  return initials.toUpperCase()
}

/**
 * Профиль текущего пользователя — тёмная карточка внизу бокового меню.
 * В свёрнутом меню остаётся только аватар.
 */
export function SidebarUser({ user }: { user: User }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-ink p-5 text-paper group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
      <Avatar size="lg" className="group-data-[collapsible=icon]:size-10">
        <AvatarFallback className="bg-paper/15 font-semibold text-paper group-data-[collapsible=icon]:bg-ink">
          {getInitials(user)}
        </AvatarFallback>
      </Avatar>
      <div className="grid min-w-0 text-left leading-snug group-data-[collapsible=icon]:hidden">
        <span className="truncate font-semibold">{user.name || user.email}</span>
        {user.name && <span className="truncate text-xs text-paper/70">{user.email}</span>}
      </div>
    </div>
  )
}
