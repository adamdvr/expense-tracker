'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { CreateTransactionDialog } from '@/features/transaction/create'
import { useCategories } from '@/entities/category'
import {
  TRANSACTIONS_PAGE_SIZE,
  TransactionRow,
  transactionKeys,
  useTransactions,
  type PaginatedTransactions,
} from '@/entities/transaction'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

/** Последние транзакции пользователя с постраничной навигацией. */
export function TransactionsList() {
  const [page, setPage] = useState(1)
  const transactions = useTransactions(page)
  const categories = useCategories()
  const queryClient = useQueryClient()

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Транзакции</CardTitle>
        <CardDescription>
          {data ? `Всего: ${data.total}` : 'Доходы и расходы, от новых к старым'}
        </CardDescription>
        <CardAction>
          <CreateTransactionDialog
            onCreated={(transaction) => {
              // На страницу 1 переходим, только если новая транзакция там реально окажется
              // (список отсортирован по дате desc) — сравниваем именно с границей страницы 1
              // (из кэша, если она туда уже когда-то загружалась), а не с текущей открытой
              // страницей: иначе, например, находясь на странице 5, легко получить transaction.date
              // «новее» верхней записи страницы 5, но саму транзакцию — не на странице 1, а на 3-й.
              const page1 = queryClient.getQueryData<PaginatedTransactions>(
                transactionKeys.list({ page: 1, limit: TRANSACTIONS_PAGE_SIZE })
              )
              const page1TopDate = page1?.items[0]?.date
              if (!page1TopDate || transaction.date >= page1TopDate) {
                setPage(1)
              }
            }}
          />
        </CardAction>
      </CardHeader>

      <CardContent>
        {categories.isError && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <span>Не удалось загрузить категории — транзакции показаны без них</span>
            <Button variant="ghost" size="sm" onClick={() => categories.refetch()}>
              Повторить
            </Button>
          </div>
        )}
        {isLoading ? (
          <TransactionsListSkeleton />
        ) : transactions.isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Не удалось загрузить транзакции</p>
            <Button variant="outline" size="sm" onClick={() => transactions.refetch()}>
              Повторить
            </Button>
          </div>
        ) : !data || data.total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Транзакций пока нет — добавьте первую
          </p>
        ) : (
          <ul
            className={cn(
              'divide-y divide-border transition-opacity',
              transactions.isPlaceholderData && 'opacity-60'
            )}
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
      </CardContent>

      {totalPages > 1 && (
        <CardFooter className="justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            Стр. {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1 || transactions.isPlaceholderData || transactions.isError}
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
        </CardFooter>
      )}
    </Card>
  )
}

function TransactionsListSkeleton() {
  return (
    <ul className="divide-y divide-border" aria-label="Загрузка транзакций">
      {Array.from({ length: TRANSACTIONS_PAGE_SIZE }, (_, index) => (
        <li key={index} className="flex items-center gap-3 py-3">
          <Skeleton className="size-9 rounded-full" />
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
