import { apiClient } from '@/shared/api'
import type { Category, CreateCategoryPayload } from '../model/types'

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
}

export function fetchCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/categories')
}

export function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  return apiClient.post<Category>('/categories', payload)
}
