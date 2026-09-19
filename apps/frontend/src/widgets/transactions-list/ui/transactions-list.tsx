'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CreateTransactionDialog } from '@/features/transaction/create'
import { useCategories } from '@/entities/category'
import { TRANSACTIONS_PAGE_SIZE, TransactionRow, useTransactions } from '@/entities/transaction'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

/** Последние транзакции пользователя с постраничной навигацией. */
export function TransactionsList() {
  const [page, setPage] = useState(1)
  const transactions = useTransactions(page)
  const categories = useCategories()

  const categoriesById = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category])),
    [categories.data]
  )

  const data = transactions.data

  // Последнее известное число страниц: если следующая страница не загрузилась, data пропадает,
  // а навигация должна остаться, чтобы можно было вернуться назад.
  const [totalPages, setTotalPages] = useState(0)
  if (data && data.totalPages !== totalPages) {
    setTotalPages(data.totalPages)
  }

  // Транзакций стало меньше (напр. удалены с другого устройства) и текущей страницы больше нет —
  // переходим на последнюю существующую.
  if (data && !transactions.isPlaceholderData && page > Math.max(data.totalPages, 1)) {
    setPage(Math.max(data.totalPages, 1))
  }

  // Ждём и категории, чтобы строки не мигали «Без категории» до их загрузки.
  // categories.isPending не включает состояние ошибки — его показываем отдельным баннером ниже,
  // не блокируя список транзакций целиком (иначе категории.isError маскировался бы под isLoading=false
  // и все строки молча становились «Без категории», неотличимо от настоящих транзакций без категории).
  const isLoading = transactions.isPending || categories.isPending

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg leading-snug font-bold tracking-tight">Транзакции</h2>
          <p className="text-sm text-muted-foreground">
            {data ? `Всего: ${data.total}` : 'Доходы и расходы, от новых к старым'}
          </p>
        </div>
        {/* Безусловный переход на страницу 1: попытки угадывать, окажется ли там новая
            транзакция, по кэшу текущей или первой страницы — хрупкие (ломаются, как только
            появятся фильтры по дате/категории/типу, меняющие ключ кэша страницы 1) и уже
            требовали нескольких раундов патчей. Список всё равно инвалидируется целиком
            (useCreateTransaction), так что «не увидел на странице 1» — редкий случай
            транзакции задним числом, а не потеря данных. */}
        <CreateTransactionDialog onCreated={() => setPage(1)} />
      </header>

      <div>
        {categories.isError && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-destructive/10 py-2 pr-2 pl-4 text-sm text-destructive">
            <span>Не удалось загрузить категории — транзакции показаны без них</span>
            <Button variant="ghost" size="sm" onClick={() => categories.refetch()}>
              Повторить
            </Button>
          </div>
        )}
        {isLoading ? (
          <TransactionsListSkeleton />
        ) : transactions.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted py-12 text-center">
            <p className="text-sm text-muted-foreground">Не удалось загрузить транзакции</p>
            <Button variant="outline" size="sm" onClick={() => transactions.refetch()}>
              Повторить
            </Button>
          </div>
        ) : !data || data.total === 0 ? (
          <p className="rounded-2xl bg-muted py-12 text-center text-sm text-muted-foreground">
            Транзакций пока нет — добавьте первую
          </p>
        ) : (
          <ul
            className={cn('flex flex-col transition-opacity', transactions.isPlaceholderData && 'opacity-60')}
            aria-busy={transactions.isPlaceholderData}
          >
            {data.items.map((transaction) => (
              <li key={transaction.id}>
                <TransactionRow
                  transaction={transaction}
                  category={categoriesById.get(transaction.categoryId)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <footer className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            Стр. {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current - 1)}
              // Без isError: страница current-1 уже была открыта раньше (навигация только
              // последовательная) и, скорее всего, в кэше — блокировать «Назад» при ошибке
              // ТЕКУЩЕЙ страницы значит закрыть путь на уже рабочую, просто увиденную страницу.
              disabled={page <= 1 || transactions.isPlaceholderData}
            >
              <ChevronLeft data-icon="inline-start" />
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages || transactions.isPlaceholderData || transactions.isError}
            >
              Вперёд
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </footer>
      )}
    </section>
  )
}

function TransactionsListSkeleton() {
  return (
    <ul className="flex flex-col" aria-label="Загрузка транзакций">
      {Array.from({ length: TRANSACTIONS_PAGE_SIZE }, (_, index) => (
        <li key={index} className="flex items-center gap-4 py-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  )
}
