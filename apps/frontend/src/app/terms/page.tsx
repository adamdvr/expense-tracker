import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Пользовательское соглашение — Трекер расходов',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground">
        ← Назад к регистрации
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Пользовательское соглашение</h1>

      <p className="mt-4 text-sm text-muted-foreground">
        Здесь будет текст пользовательского соглашения. Страница — заглушка: заполните её
        актуальным юридическим текстом перед запуском в продакшен.
      </p>
    </main>
  )
}
