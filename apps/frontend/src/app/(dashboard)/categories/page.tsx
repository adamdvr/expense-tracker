import type { Metadata } from 'next'

import { CategoriesList } from '@/widgets/categories-list'

export const metadata: Metadata = {
  title: 'Категории — Трекер расходов',
}

export default function CategoriesPage() {
  return (
    <div className="w-full max-w-3xl">
      <CategoriesList />
    </div>
  )
}
