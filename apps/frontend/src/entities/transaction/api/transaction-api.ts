import { apiClient } from '@/shared/api'
import type {
  CreateTransactionPayload,
  PaginatedTransactions,
  Transaction,
  TransactionsListParams,
} from '../model/types'

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (params: TransactionsListParams) => [...transactionKeys.lists(), params] as const,
}

export function fetchTransactions({
  page,
  limit,
}: TransactionsListParams): Promise<PaginatedTransactions> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) })
  return apiClient.get<PaginatedTransactions>(`/transactions?${query}`)
}

export function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  return apiClient.post<Transaction>('/transactions', payload)
}
