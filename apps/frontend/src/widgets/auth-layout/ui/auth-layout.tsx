import { Wallet } from 'lucide-react'
import Link from 'next/link'

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-5">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3 text-foreground">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          <span className="text-base font-bold tracking-tight">Трекер расходов</span>
        </Link>

        <div className="rounded-2xl bg-card p-6 sm:p-10">
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">{description}</p>
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {footer.text}{' '}
          <Link
            href={footer.href}
            className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            {footer.linkText}
          </Link>
        </p>
      </div>
    </main>
  )
}
