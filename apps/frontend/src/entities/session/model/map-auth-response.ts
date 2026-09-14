import type { AuthResponse, Session } from './types'

/** Приводит ответ backend (`snake_case`) к внутренней модели сессии. */
export function toSession(response: AuthResponse): Session {
  return {
    accessToken: response.access_token,
    user: response.user,
  }
}
