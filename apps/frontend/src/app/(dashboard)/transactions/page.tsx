import type { Metadata } from 'next'

import { SectionPlaceholder } from '@/widgets/section-placeholder'

export const metadata: Metadata = {
  title: 'Транзакции — Трекер расходов',
}

export default function TransactionsPage() {
  return (
    <SectionPlaceholder description="Полный список транзакций появится здесь. Последние записи пока на главной." />
  )
}
