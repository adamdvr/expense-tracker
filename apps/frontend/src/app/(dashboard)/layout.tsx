import { AppShell } from '@/widgets/app-shell'

/** Авторизованная часть приложения: боковое меню + шапка. Route group не влияет на URL. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
