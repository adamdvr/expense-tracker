'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { getSession } from '@/entities/session'
import { setAuthTokenGetter } from '@/shared/api'
import { TooltipProvider } from '@/shared/ui/tooltip'

// Токен читается при каждом запросе, поэтому login/logout подхватываются без перерегистрации.
setAuthTokenGetter(() => getSession()?.accessToken ?? null)

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient создаётся в useState, чтобы не шарить кэш между запросами на сервере
  // и не пересоздавать его при ререндерах.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )
}
