import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

interface AuthLayoutFooter {
  text: string
  linkText: string
  href: string
}

interface AuthLayoutProps {
  title: string
  description: string
  footer: AuthLayoutFooter
  children: React.ReactNode
}

/** Общая обёртка для страниц /login и /register — брендинг, карточка, ссылка между ними. */
export function AuthLayout({ title, description, footer, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 block text-center text-lg font-semibold text-foreground"
        >
          Трекер расходов
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {footer.text}{' '}
          <Link href={footer.href} className="font-medium text-primary hover:underline">
            {footer.linkText}
          </Link>
        </p>
      </div>
    </main>
  )
}
