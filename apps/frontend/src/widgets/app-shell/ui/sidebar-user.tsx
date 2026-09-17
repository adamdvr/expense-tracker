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

/** Профиль текущего пользователя в футере бокового меню. */
export function SidebarUser({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-2 rounded-md p-2 group-data-[collapsible=icon]:p-0">
      <Avatar className="size-8">
        <AvatarFallback className="bg-primary/15 font-medium text-primary">
          {getInitials(user)}
        </AvatarFallback>
      </Avatar>
      <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-medium">{user.name || user.email}</span>
        {user.name && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
      </div>
    </div>
  )
}
