'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useCategories } from '@/entities/category'
import type { Transaction, TransactionType } from '@/entities/transaction'
import { getApiErrorMessage } from '@/shared/api'
import { todayInputValue } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

import { useCreateTransaction } from '../api/use-create-transaction'
import {
  createTransactionSchema,
  toCreateTransactionPayload,
  type CreateTransactionFormValues,
} from '../model/schema'

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'EXPENSE', label: 'Расход' },
  { value: 'INCOME', label: 'Доход' },
]

interface CreateTransactionFormProps {
  onSuccess?: (transaction: Transaction) => void
  /** Если передан — рядом с «Добавить» появляется кнопка «Отмена». */
  onCancel?: () => void
  /** Обёртка для кнопок формы, напр. `DialogFooter`. Форма не зависит от места, где её показывают. */
  renderFooter?: (actions: ReactNode) => ReactNode
}

function defaultRenderFooter(actions: ReactNode) {
  return <div className="mt-5 flex justify-end gap-2">{actions}</div>
}

export function CreateTransactionForm({
  onSuccess,
  onCancel,
  renderFooter = defaultRenderFooter,
}: CreateTransactionFormProps) {
  const [rootError, setRootError] = useState<string | null>(null)
  const categories = useCategories()
  const createTransaction = useCreateTransaction()
  // Синхронный флаг против двойного сабмита: createTransaction.isPending обновляется через
  // useSyncExternalStore и может не успеть перерисовать (задизейблить) кнопку между двумя
  // быстрыми кликами/Enter, а этот ref проверяется и выставляется сразу, без ожидания рендера.
  const isSubmittingRef = useRef(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      amount: '',
      type: 'EXPENSE',
      categoryId: '',
      date: todayInputValue(),
      description: '',
    },
  })

  const categoryItems = (categories.data ?? []).map((category) => ({
    value: category.id,
    label: category.name,
  }))
  const hasNoCategories = categories.isSuccess && categoryItems.length === 0

  const onSubmit = (values: CreateTransactionFormValues) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setRootError(null)
    createTransaction.mutate(toCreateTransactionPayload(values), {
      onSuccess: (transaction) => {
        isSubmittingRef.current = false
        onSuccess?.(transaction)
      },
      onError: (error) => {
        isSubmittingRef.current = false
        setRootError(getApiErrorMessage(error))
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Тип</FieldLabel>
              {/* Сегментированный переключатель: выбранный вариант — ink-пилюля, читается и без цвета. */}
              <div
                className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
                role="group"
                aria-label="Тип транзакции"
              >
                {TRANSACTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    aria-pressed={field.value === type.value}
                    onClick={() => field.onChange(type.value)}
                    className={cn(
                      'h-9 rounded-full text-sm font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      field.value === type.value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </Field>
          )}
        />

        <Field data-invalid={errors.amount ? 'true' : undefined}>
          <FieldLabel htmlFor="transaction-amount">Сумма, ₽</FieldLabel>
          <Input
            id="transaction-amount"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            aria-invalid={!!errors.amount}
            {...register('amount')}
          />
          <FieldError errors={errors.amount ? [errors.amount] : undefined} />
        </Field>

        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Field data-invalid={errors.categoryId ? 'true' : undefined}>
              <FieldLabel htmlFor="transaction-category">Категория</FieldLabel>
              <Select
                items={categoryItems}
                value={field.value || null}
                onValueChange={(value) => field.onChange(value ?? '')}
                disabled={!categories.isSuccess || hasNoCategories}
              >
                <SelectTrigger
                  id="transaction-category"
                  className="w-full"
                  aria-invalid={!!errors.categoryId}
                  onBlur={field.onBlur}
                >
                  <SelectValue
                    placeholder={categories.isPending ? 'Загрузка…' : 'Выберите категорию'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasNoCategories && (
                <FieldDescription>
                  Сначала создайте категорию — без неё транзакцию не сохранить.
                </FieldDescription>
              )}
              {categories.isError && (
                <FieldDescription className="text-destructive">
                  Не удалось загрузить категории
                </FieldDescription>
              )}
              <FieldError errors={errors.categoryId ? [errors.categoryId] : undefined} />
            </Field>
          )}
        />

        <Field data-invalid={errors.date ? 'true' : undefined}>
          <FieldLabel htmlFor="transaction-date">Дата</FieldLabel>
          <Input
            id="transaction-date"
            type="date"
            aria-invalid={!!errors.date}
            {...register('date')}
          />
          <FieldError errors={errors.date ? [errors.date] : undefined} />
        </Field>

        <Field data-invalid={errors.description ? 'true' : undefined}>
          <FieldLabel htmlFor="transaction-description">Описание</FieldLabel>
          <Input
            id="transaction-description"
            placeholder="Необязательно"
            autoComplete="off"
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          <FieldError errors={errors.description ? [errors.description] : undefined} />
        </Field>

        {rootError && (
          <p role="alert" className="text-sm text-destructive">
            {rootError}
          </p>
        )}
      </FieldGroup>

      {renderFooter(
        <>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          )}
          <Button
            type="submit"
            disabled={createTransaction.isPending || hasNoCategories || !categories.isSuccess}
          >
            {createTransaction.isPending ? 'Сохраняем…' : 'Добавить'}
          </Button>
        </>
      )}
    </form>
  )
}
