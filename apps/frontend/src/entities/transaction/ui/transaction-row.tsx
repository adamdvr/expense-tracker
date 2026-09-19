import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { formatDate, formatMoney } from '@/shared/lib/format'
import type { Transaction } from '../model/types'

/** Минимум данных категории для отображения — сама сущность category сюда не импортируется (FSD). */
interface TransactionRowCategory {
  name: string
  color: string
}

interface TransactionRowProps {
  transaction: Transaction
  category?: TransactionRowCategory
  className?: string
}

export function TransactionRow({ transaction, category, className }: TransactionRowProps) {
  const isIncome = transaction.type === 'INCOME'
  const categoryName = category?.name ?? 'Без категории'
  const DirectionIcon = isIncome ? ArrowDownLeft : ArrowUpRight

  return (
    <div className={cn('flex items-center gap-4 py-3', className)}>
      {/* Направление денег: пастельный круг + стрелка. Цвет категории — точка у названия,
          он задаётся пользователем и на светлом фоне не подходит для заливки. */}
      <span
        aria-hidden
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full',
          isIncome ? 'bg-mint text-income' : 'bg-peach text-foreground'
        )}
      >
        <DirectionIcon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {category && (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          )}
          <span className="truncate">{categoryName}</span>
        </p>
        {transaction.description && (
          <p className={cn('truncate text-sm text-muted-foreground', category && 'pl-4')}>
            {transaction.description}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            'text-base font-bold tabular-nums',
            isIncome ? 'text-income' : 'text-foreground'
          )}
        >
          {isIncome ? '+' : '−'}
          {formatMoney(transaction.amount)}
        </p>
        <p className="text-sm text-muted-foreground">
          <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
        </p>
      </div>
    </div>
  )
}
