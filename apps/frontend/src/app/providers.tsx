'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { clearSession, getSession, useSession } from '@/entities/session'
import { ApiError, setAuthTokenGetter, setUnauthorizedHandler } from '@/shared/api'
import { TooltipProvider } from '@/shared/ui/tooltip'

// Токен читается при каждом запросе, поэтому login/logout подхватываются без перерегистрации.
setAuthTokenGetter(() => getSession()?.accessToken ?? null)
// 401 на запросе с токеном — токен истёк: сбрасываем сессию, AppShell сам уведёт на /login.
setUnauthorizedHandler(() => clearSession())

const MAX_QUERY_RETRIES = 1

/** Ошибки 4xx (401, 403, 404, 400) при повторе не исчезнут — повторяем только сетевые и 5xx. */
function shouldRetryQuery(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.statusCode < 500) {
    return false
  }
  return failureCount < MAX_QUERY_RETRIES
}

/**
 * Ключи кэша не содержат id пользователя, поэтому при logout или входе под другим
 * пользователем кэш очищается — иначе новый пользователь увидит данные предыдущего.
 */
function useClearQueryCacheOnUserChange(queryClient: QueryClient): void {
  const { status, session } = useSession()
  const userId = session?.user.id ?? null
  // undefined — сессия ещё не прочитана, сравнивать не с чем.
  const previousUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (status === 'loading') {
      return
    }
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      queryClient.clear()
    }
    previousUserId.current = userId
  }, [status, userId, queryClient])
}

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient создаётся в useState, чтобы не шарить кэш между запросами на сервере
  // и не пересоздавать его при ререндерах.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: shouldRetryQuery,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  useClearQueryCacheOnUserChange(queryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )
}
