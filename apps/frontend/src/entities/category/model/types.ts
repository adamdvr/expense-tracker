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

/** Тело `POST /categories`. */
export interface CreateCategoryPayload {
  name: string
  /** HEX-цвет с `#`: без него backend цвет примет, а CSS — нет. */
  color: string
  /** Имя иконки из `CATEGORY_ICONS`, напр. `shopping-cart`. */
  icon: string
}
