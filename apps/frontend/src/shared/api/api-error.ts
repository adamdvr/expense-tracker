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
