/**
 * Ошибка ответа API. Нормализует формат ошибок Nest (`{ statusCode, message, error }`),
 * где `message` может быть строкой (бизнес-ошибка, напр. 401/409) или массивом строк
 * (ошибки валидации class-validator, напр. 400).
 */
export class ApiError extends Error {
  readonly statusCode: number
  readonly messages: string[]

  constructor(statusCode: number, messages: string[]) {
    super(messages[0] ?? 'Не удалось выполнить запрос')
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.messages = messages
  }
}

const DEFAULT_ERROR_MESSAGE = 'Не удалось подключиться к серверу. Попробуйте ещё раз.'

/** Текст для пользователя из ошибки запроса: сообщения `ApiError` или дефолт для сетевых сбоев. */
export function getApiErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  return error instanceof ApiError ? error.messages.join(', ') : fallback
}
