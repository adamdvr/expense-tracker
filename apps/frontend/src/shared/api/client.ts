import { API_URL } from '@/shared/config'
import { ApiError } from './api-error'

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

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

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await parseJsonBody(response)

  if (!response.ok) {
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
