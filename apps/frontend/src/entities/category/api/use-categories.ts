import { useQuery } from '@tanstack/react-query'
import { categoryKeys, fetchCategories } from './category-api'

/** Все категории текущего пользователя (сортировка backend — по дате создания). */
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: fetchCategories,
  })
}
