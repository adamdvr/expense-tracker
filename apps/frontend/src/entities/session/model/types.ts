import type { User } from '@/entities/user'

/** Данные сессии в приложении. */
export interface Session {
  accessToken: string
  user: User
}

/** Сырой ответ backend (`AuthResponseDto`) — приходит из `POST /auth/login` и `POST /auth/register`. */
export interface AuthResponse {
  access_token: string
  user: User
}
