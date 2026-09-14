'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CreateTransactionDialog } from '@/features/transaction/create'
import { useCategories } from '@/entities/category'
import { TRANSACTIONS_PAGE_SIZE, TransactionRow, useTransactions } from '@/entities/transaction'
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

  const categoriesById = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category])),
    [categories.data]
  )

  const data = transactions.data
  const totalPages = data?.totalPages ?? 0
  // Ждём и категории, чтобы строки не мигали «Без категории» до их загрузки.
  const isLoading = transactions.isPending || categories.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Транзакции</CardTitle>
        <CardDescription>
          {data ? `Всего: ${data.total}` : 'Доходы и расходы, от новых к старым'}
        </CardDescription>
        <CardAction>
          {/* После создания возвращаемся на первую страницу — обычно новая транзакция там. */}
          <CreateTransactionDialog onCreated={() => setPage(1)} />
        </CardAction>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <TransactionsListSkeleton />
        ) : transactions.isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Не удалось загрузить транзакции</p>
            <Button variant="outline" size="sm" onClick={() => transactions.refetch()}>
              Повторить
            </Button>
          </div>
        ) : !data || data.items.length === 0 ? (
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
              disabled={page <= 1 || transactions.isPlaceholderData}
            >
              <ChevronLeft data-icon="inline-start" />
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages || transactions.isPlaceholderData}
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
