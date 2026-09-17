import { API_URL } from '@/shared/config'
import { ApiError } from './api-error'

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

type AuthTokenGetter = () => string | null

let getAuthToken: AuthTokenGetter = () => null

/**
 * Регистрирует источник access token для заголовка Authorization.
 * shared не знает про entities/session, поэтому getter подключает слой app.
 */
export function setAuthTokenGetter(getter: AuthTokenGetter): void {
  getAuthToken = getter
}

type UnauthorizedHandler = () => void

let onUnauthorized: UnauthorizedHandler = () => {}

/**
 * Регистрирует реакцию на 401 для запросов с токеном (истёкший или отозванный токен).
 * Запросы без токена (напр. неверный пароль при логине) обработчик не вызывают.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler
}

function normalizeMessage(message: unknown): string[] {
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === 'string')
  }
  if (typeof message === 'string') {
    return [message]
  }
  return ['Не удалось выполнить запрос']
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// /auth/* (логин, регистрация) не требует и не должен использовать текущий токен: иначе
// у уже залогиненного пользователя неверный пароль на /login приведёт к 401 с токеном
// в заголовке, и onUnauthorized() ошибочно сбросит его рабочую сессию.
function isAuthEndpoint(path: string): boolean {
  return path.startsWith('/auth/')
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const token = isAuthEndpoint(path) ? null : getAuthToken()

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: rest.signal ?? AbortSignal.timeout(15_000),
  })

  const data = await parseJsonBody(response)

  if (!response.ok) {
    if (response.status === 401 && token) {
      onUnauthorized()
    }
    const errorBody = data as { message?: unknown } | null
    throw new ApiError(response.status, normalizeMessage(errorBody?.message))
  }

  return data as T
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
}
