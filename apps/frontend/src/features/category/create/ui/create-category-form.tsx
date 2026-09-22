'use client'

import { Check } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CategoryIcon,
  DEFAULT_CATEGORY_ICON,
  useCategories,
  type Category,
} from '@/entities/category'
import { getApiErrorMessage } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

import { useCreateCategory } from '../api/use-create-category'
import {
  createCategorySchema,
  pickFreeCategoryColor,
  toCreateCategoryPayload,
  type CreateCategoryFormValues,
} from '../model/schema'

interface CreateCategoryFormProps {
  onSuccess?: (category: Category) => void
  /** Если передан — рядом с «Добавить» появляется кнопка «Отмена». */
  onCancel?: () => void
  /** Обёртка для кнопок формы, напр. `DialogFooter`. Форма не зависит от места, где её показывают. */
  renderFooter?: (actions: ReactNode) => ReactNode
}

function defaultRenderFooter(actions: ReactNode) {
  return <div className="mt-5 flex justify-end gap-2">{actions}</div>
}

// Цвет и иконка выбираются нативными radio: стрелки, Tab и озвучка «1 из 8» работают без своего
// кода. Сам radio визуально скрыт, выбор и фокус рисует элемент после него (peer-*).
const OPTION_CLASS = 'relative flex aspect-square cursor-pointer items-center justify-center'
const OPTION_FOCUS_CLASS =
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring'

export function CreateCategoryForm({
  onSuccess,
  onCancel,
  renderFooter = defaultRenderFooter,
}: CreateCategoryFormProps) {
  const [rootError, setRootError] = useState<string | null>(null)
  const categories = useCategories()
  const createCategory = useCreateCategory()
  // Синхронный флаг против двойного сабмита — см. комментарий в CreateTransactionForm.
  const isSubmittingRef = useRef(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      // Форма монтируется при открытии диалога — к этому моменту категории обычно уже в кэше.
      color: pickFreeCategoryColor(categories.data),
      icon: DEFAULT_CATEGORY_ICON,
    },
  })
  const [selectedColor, selectedIcon] = useWatch({ control, name: ['color', 'icon'] })

  const onSubmit = (values: CreateCategoryFormValues) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setRootError(null)
    createCategory.mutate(toCreateCategoryPayload(values), {
      onSuccess: (category) => {
        isSubmittingRef.current = false
        onSuccess?.(category)
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
        <Field data-invalid={errors.name ? 'true' : undefined}>
          <FieldLabel htmlFor="category-name">Название</FieldLabel>
          <Input
            id="category-name"
            placeholder="Например, Продукты"
            autoComplete="off"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <FieldError errors={errors.name ? [errors.name] : undefined} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Цвет</FieldLegend>
          <div className="grid grid-cols-8 gap-2">
            {CATEGORY_COLORS.map((color) => (
              <label key={color.value} className={OPTION_CLASS}>
                <input
                  type="radio"
                  value={color.value}
                  aria-label={color.label}
                  className="peer sr-only"
                  {...register('color')}
                />
                {/* Выбранный цвет — кольцо и галочка, а не только цвет. */}
                <span
                  aria-hidden
                  className={cn(
                    'size-7 rounded-full peer-checked:ring-2 peer-checked:ring-current peer-checked:ring-offset-2 peer-checked:ring-offset-popover',
                    OPTION_FOCUS_CLASS
                  )}
                  style={{ backgroundColor: color.value, color: color.value }}
                />
                <Check
                  aria-hidden
                  className="pointer-events-none absolute hidden size-4 text-white peer-checked:block"
                />
              </label>
            ))}
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">Значок</FieldLegend>
          <div className="grid grid-cols-8 gap-2">
            {CATEGORY_ICONS.map((option) => (
              <label key={option.name} title={option.label} className={OPTION_CLASS}>
                <input
                  type="radio"
                  value={option.name}
                  aria-label={option.label}
                  className="peer sr-only"
                  {...register('icon')}
                />
                {/* Выбранная иконка рисуется в выбранном цвете — это и есть превью категории. */}
                {option.name === selectedIcon ? (
                  <CategoryIcon
                    icon={option.name}
                    color={selectedColor}
                    className={cn(
                      'size-full max-h-12 max-w-12 ring-2 ring-current',
                      OPTION_FOCUS_CLASS
                    )}
                  />
                ) : (
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-full max-h-12 max-w-12 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground [&>svg]:size-5',
                      OPTION_FOCUS_CLASS
                    )}
                  >
                    <option.icon />
                  </span>
                )}
              </label>
            ))}
          </div>
        </FieldSet>

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
          <Button type="submit" disabled={createCategory.isPending}>
            {createCategory.isPending ? 'Сохраняем…' : 'Добавить'}
          </Button>
        </>
      )}
    </form>
  )
}
