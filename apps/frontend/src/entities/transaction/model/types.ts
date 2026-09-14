export type TransactionType = 'INCOME' | 'EXPENSE'

/** Транзакция пользователя (`TransactionEntity` на backend). */
export interface Transaction {
  id: string
  /** Сумма строкой с 2 знаками после запятой, напр. `"1500.50"`. */
  amount: string
  type: TransactionType
  description: string | null
  /** ISO-строка, полночь UTC. */
  date: string
  categoryId: string
  userId: string
  createdAt: string
}

/** Страница транзакций (`PaginatedTransactionsEntity` на backend). */
export interface PaginatedTransactions {
  items: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TransactionsListParams {
  page: number
  limit: number
}

/** Тело `POST /transactions`. */
export interface CreateTransactionPayload {
  amount: number
  type: TransactionType
  description?: string
  /** ISO-строка. */
  date: string
  categoryId: string
}
