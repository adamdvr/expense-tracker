import type { Session } from './types'

const SESSION_KEY = 'tracker:session'

/** Событие смены сессии в текущей вкладке (`storage` срабатывает только в других вкладках). */
export const SESSION_CHANGE_EVENT = 'tracker:session-change'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/** Сырая строка сессии из localStorage — стабильный snapshot для `useSyncExternalStore`. */
export function getRawSession(): string | null {
  if (!isBrowser()) {
    return null
  }

  return window.localStorage.getItem(SESSION_KEY)
}

export function parseSession(raw: string | null): Session | null {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

/** Читает сессию из localStorage. На сервере (SSR) и при повреждённых данных — null. */
export function getSession(): Session | null {
  return parseSession(getRawSession())
}

export function setSession(session: Session): void {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT))
}

export function clearSession(): void {
  if (!isBrowser()) {
    return
  }

  window.localStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT))
}
