import { useMutation, useQueryClient } from '@tanstack/react-query'

import { categoryKeys, createCategory } from '@/entities/category'

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCategory,
    // Категории читают и список на /categories, и Select в форме транзакции — сбрасываем все их запросы.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}
