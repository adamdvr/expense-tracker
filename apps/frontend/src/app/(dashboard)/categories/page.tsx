import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Категории — Трекер расходов',
}

export default function CategoriesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <h2 className="text-lg font-semibold">Категории</h2>
      <p className="text-sm text-muted-foreground">Раздел в разработке</p>
    </div>
  )
}
