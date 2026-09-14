/** Пользователь, как он приходит от backend (`UserEntity`) — без passwordHash. */
export interface User {
  id: string
  email: string
  name: string | null
  createdAt: string
  updatedAt: string
}
