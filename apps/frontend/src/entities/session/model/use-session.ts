import { useMemo, useSyncExternalStore } from 'react'
import { getRawSession, parseSession, SESSION_CHANGE_EVENT } from './storage'
import type { Session } from './types'

export type SessionState =
  | { status: 'loading'; session: null }
  | { status: 'authenticated'; session: Session }
  | { status: 'unauthenticated'; session: null }

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(SESSION_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(SESSION_CHANGE_EVENT, onChange)
  }
}

// undefined — «ещё не знаем»: на сервере и во время гидратации localStorage недоступен,
// поэтому до гидратации статус loading, а не unauthenticated (иначе ложный редирект на /login).
function getServerSnapshot(): string | null | undefined {
  return undefined
}

/** Текущая сессия из localStorage с подпиской на login/logout (в т.ч. из других вкладок). */
export function useSession(): SessionState {
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribe,
    getRawSession,
    getServerSnapshot
  )

  return useMemo(() => {
    if (raw === undefined) {
      return { status: 'loading', session: null }
    }
    const session = parseSession(raw)
    return session
      ? { status: 'authenticated', session }
      : { status: 'unauthenticated', session: null }
  }, [raw])
}
