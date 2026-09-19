import type { Metadata } from 'next'

import { SectionPlaceholder } from '@/widgets/section-placeholder'

export const metadata: Metadata = {
  title: 'Категории — Трекер расходов',
}

export default function CategoriesPage() {
  return <SectionPlaceholder description="Здесь появится управление категориями доходов и расходов." />
}
