import type { Metadata } from 'next'

import { TransactionsList } from '@/widgets/transactions-list'

export const metadata: Metadata = {
  title: 'Главная — Трекер расходов',
}

export default function HomePage() {
  return (
    <div className="w-full max-w-3xl">
      <TransactionsList />
    </div>
  )
}
