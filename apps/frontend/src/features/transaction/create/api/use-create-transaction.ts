import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createTransaction, transactionKeys } from '@/entities/transaction'

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTransaction,
    // Новая транзакция может сдвинуть любую страницу списка — сбрасываем кэш всех страниц.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
  })
}
