import type { Metadata } from 'next'

import { AuthLayout } from '@/widgets/auth-layout'
import { LoginForm } from '@/features/auth/login'

export const metadata: Metadata = {
  title: 'Вход — Трекер расходов',
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="Вход"
      description="Войдите в аккаунт, чтобы продолжить"
      footer={{ text: 'Нет аккаунта?', linkText: 'Зарегистрироваться', href: '/register' }}
    >
      <LoginForm />
    </AuthLayout>
  )
}
