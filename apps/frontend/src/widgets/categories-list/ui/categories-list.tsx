'use client'

import { CreateCategoryDialog } from '@/features/category/create'
import { CategoryIcon, useCategories } from '@/entities/category'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

const SKELETON_ROWS = 4

/** Категории пользователя и создание новой. */
export function CategoriesList() {
  const categories = useCategories()

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg leading-snug font-bold tracking-tight">Ваши категории</h2>
          <p className="text-sm text-muted-foreground">
            {categories.data ? `Всего: ${categories.data.length}` : 'Группы для доходов и расходов'}
          </p>
        </div>
        <CreateCategoryDialog />
      </header>

      {categories.isPending ? (
        <CategoriesListSkeleton />
      ) : categories.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted py-12 text-center">
          <p className="text-sm text-muted-foreground">Не удалось загрузить категории</p>
          <Button variant="outline" size="sm" onClick={() => categories.refetch()}>
            Повторить
          </Button>
        </div>
      ) : categories.data.length === 0 ? (
        <p className="rounded-2xl bg-muted py-12 text-center text-sm text-muted-foreground">
          Категорий пока нет — добавьте первую
        </p>
      ) : (
        // Backend сортирует по дате создания — новая категория появляется в конце списка.
        // Колонки явные (minmax(0, 1fr)): неявный auto-трек растянулся бы под длинное
        // название с nowrap, и truncate не сработал бы.
        <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {categories.data.map((category) => (
            <li key={category.id} className="flex items-center gap-4 py-3">
              <CategoryIcon icon={category.icon} color={category.color} />
              <span className="min-w-0 truncate text-sm font-medium">{category.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CategoriesListSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2" aria-label="Загрузка категорий">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className="flex items-center gap-4 py-3">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </li>
      ))}
    </ul>
  )
}
