import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { TRANSACTIONS_PAGE_SIZE } from '../config/pagination'
import { fetchTransactions, transactionKeys } from './transaction-api'

/** Страница транзакций текущего пользователя, от новых к старым. */
export function useTransactions(page: number, limit = TRANSACTIONS_PAGE_SIZE) {
  return useQuery({
    queryKey: transactionKeys.list({ page, limit }),
    queryFn: () => fetchTransactions({ page, limit }),
    // При переключении страницы показываем предыдущую, пока грузится следующая — без мигания скелетона.
    placeholderData: keepPreviousData,
  })
}
