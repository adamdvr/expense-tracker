import type { Session } from './types'

const SESSION_KEY = 'tracker:session'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/** Читает сессию из localStorage. На сервере (SSR) и при повреждённых данных — null. */
export function getSession(): Session | null {
  if (!isBrowser()) {
    return null
  }

  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function setSession(session: Session): void {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  if (!isBrowser()) {
    return
  }

  window.localStorage.removeItem(SESSION_KEY)
}
