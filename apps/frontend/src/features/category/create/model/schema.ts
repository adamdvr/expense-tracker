import { z } from 'zod'

import { CATEGORY_COLORS, type Category, type CreateCategoryPayload } from '@/entities/category'

/** Как `@MaxLength(50)` в `CreateCategoryDto` на backend. */
const MAX_NAME_LENGTH = 50

export const createCategorySchema = z.object({
  // trim обязателен: backend (@IsNotEmpty) сохранил бы название из одних пробелов.
  name: z
    .string()
    .trim()
    .min(1, 'Введите название')
    .max(MAX_NAME_LENGTH, `Не больше ${MAX_NAME_LENGTH} символов`),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Выберите цвет'),
  icon: z.string().min(1, 'Выберите значок'),
})

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>

export function toCreateCategoryPayload(values: CreateCategoryFormValues): CreateCategoryPayload {
  return {
    name: values.name.trim(),
    color: values.color,
    icon: values.icon,
  }
}

/**
 * Цвет новой категории по умолчанию — первый цвет палитры, которого ещё нет у категорий
 * пользователя: категории, созданные подряд без выбора цвета, не сливаются. Заняты все — первый.
 */
export function pickFreeCategoryColor(categories: Category[] | undefined): string {
  const usedColors = new Set(categories?.map((category) => category.color.toUpperCase()))
  const freeColor = CATEGORY_COLORS.find((color) => !usedColors.has(color.value))
  return (freeColor ?? CATEGORY_COLORS[0]).value
}
