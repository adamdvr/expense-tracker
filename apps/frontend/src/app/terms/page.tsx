import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Пользовательское соглашение — Трекер расходов',
}

export default function TermsPage() {
  return (
    <main className="mx-auto my-5 max-w-2xl rounded-2xl bg-card p-6 sm:my-10 sm:p-12">
      <Link href="/register" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        ← Назад к регистрации
      </Link>

      <h1 className="mt-8 text-[1.75rem] leading-tight font-bold tracking-tight">Пользовательское соглашение</h1>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Здесь будет текст пользовательского соглашения. Страница — заглушка: заполните её
        актуальным юридическим текстом перед запуском в продакшен.
      </p>
    </main>
  )
}
