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

  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: category?.color ?? 'var(--muted)' }}
      >
        {categoryName.charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{categoryName}</p>
        {transaction.description && (
          <p className="truncate text-sm text-muted-foreground">{transaction.description}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            isIncome ? 'text-emerald-400' : 'text-foreground'
          )}
        >
          {isIncome ? '+' : '−'}
          {formatMoney(transaction.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
        </p>
      </div>
    </div>
  )
}
