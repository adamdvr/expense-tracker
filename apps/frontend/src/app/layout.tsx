import type { Metadata, Viewport } from 'next'
import { Onest } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// Единственный шрифт проекта. Кириллица нужна: интерфейс русскоязычный.
const onest = Onest({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-onest',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Трекер расходов',
  description: 'Приложение для учета личных финансов',
}

export const viewport: Viewport = {
  themeColor: '#EFEFF2',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Тема единственная — светлая, класс dark не задаётся (см. :root в globals.css).
  //
  // suppressHydrationWarning: некоторые расширения браузера (переводчики и т.п.)
  // дописывают свои атрибуты в <html> до гидратации React, из-за чего React
  // ложно ругается на несовпадение серверного и клиентского HTML именно этого
  // тега. Подавляет предупреждение только по атрибутам <html> — гидратацию
  // остального дерева (в т.ч. реальные ошибки) по-прежнему проверяет.
  return (
    <html lang="ru" className={onest.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
