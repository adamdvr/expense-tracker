import { z } from 'zod'

import type { CreateTransactionPayload } from '@/entities/transaction'
import { dateInputToIso } from '@/shared/lib/format'

const MAX_AMOUNT = 9_999_999_999.99

/** Сумма из поля ввода: допускаем запятую как десятичный разделитель. */
function parseAmount(value: string): number {
  return Number(value.replace(',', '.'))
}

// amount хранится в форме строкой (как в <input>), в число переводится при отправке —
// так у формы один тип значений на вход и на выход.
export const createTransactionSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Введите сумму')
    .regex(/^\d+([.,]\d{1,2})?$/, 'Введите число, не больше 2 знаков после запятой')
    .refine((value) => parseAmount(value) > 0, 'Сумма должна быть больше нуля')
    .refine((value) => parseAmount(value) <= MAX_AMOUNT, 'Слишком большая сумма'),
  type: z.enum(['EXPENSE', 'INCOME']),
  categoryId: z.string().min(1, 'Выберите категорию'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату'),
  description: z.string().trim().max(255, 'Не больше 255 символов'),
})

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>

export function toCreateTransactionPayload(
  values: CreateTransactionFormValues
): CreateTransactionPayload {
  return {
    amount: parseAmount(values.amount),
    type: values.type,
    categoryId: values.categoryId,
    date: dateInputToIso(values.date),
    description: values.description.trim() || undefined,
  }
}
