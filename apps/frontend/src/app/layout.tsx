import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Трекер расходов',
  description: 'Приложение для учета личных финансов',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Единственная тема — тёмная, поэтому класс dark задаётся статически,
  // без переключателя (см. .dark в globals.css).
  //
  // suppressHydrationWarning: некоторые расширения браузера (переводчики и т.п.)
  // дописывают свои атрибуты в <html> до гидратации React, из-за чего React
  // ложно ругается на несовпадение серверного и клиентского HTML именно этого
  // тега. Подавляет предупреждение только по атрибутам <html> — гидратацию
  // остального дерева (в т.ч. реальные ошибки) по-прежнему проверяет.
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
