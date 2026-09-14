import type { Metadata } from 'next'

import { AuthLayout } from '@/widgets/auth-layout'
import { RegisterForm } from '@/features/auth/register'

export const metadata: Metadata = {
  title: 'Регистрация — Трекер расходов',
}

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Регистрация"
      description="Создайте аккаунт, чтобы начать"
      footer={{ text: 'Уже есть аккаунт?', linkText: 'Войти', href: '/login' }}
    >
      <RegisterForm />
    </AuthLayout>
  )
}
