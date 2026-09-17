/** Категория пользователя (`CategoryEntity` на backend). */
export interface Category {
  id: string
  name: string
  /** HEX-цвет, напр. `#FF5733`. */
  color: string
  /** Имя иконки, напр. `shopping-cart`. */
  icon: string
  userId: string
  createdAt: string
  updatedAt: string
}
