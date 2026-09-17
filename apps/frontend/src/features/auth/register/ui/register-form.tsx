'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { apiClient, getApiErrorMessage } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/checkbox'
import { Field, FieldGroup, FieldLabel, FieldError } from '@/shared/ui/field'
import { setSession, toSession, type AuthResponse } from '@/entities/session'

import { registerSchema, type RegisterFormValues } from '../model/schema'

export function RegisterForm() {
  const router = useRouter()
  const [rootError, setRootError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', name: '', agreedToTerms: false },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setRootError(null)
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        email: values.email,
        password: values.password,
        name: values.name.trim() || undefined,
      })
      // Регистрация сразу возвращает токен — авто-логин без отдельного запроса.
      setSession(toSession(response))
      router.push('/')
      router.refresh()
    } catch (error) {
      setRootError(getApiErrorMessage(error))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="register-name">Имя</FieldLabel>
          <Input id="register-name" type="text" autoComplete="name" {...register('name')} />
        </Field>

        <Field data-invalid={errors.email ? 'true' : undefined}>
          <FieldLabel htmlFor="register-email">Email</FieldLabel>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          <FieldError errors={errors.email ? [errors.email] : undefined} />
        </Field>

        <Field data-invalid={errors.password ? 'true' : undefined}>
          <FieldLabel htmlFor="register-password">Пароль</FieldLabel>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError errors={errors.password ? [errors.password] : undefined} />
        </Field>

        <Field orientation="horizontal" data-invalid={errors.agreedToTerms ? 'true' : undefined}>
          <Controller
            control={control}
            name="agreedToTerms"
            render={({ field }) => (
              <Checkbox
                id="register-terms"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={!!errors.agreedToTerms}
              />
            )}
          />
          <FieldLabel htmlFor="register-terms" className="font-normal">
            {/* FieldLabel сам flex-контейнер (нужен для паттерна "чекбокс внутри лейбла-карточки"),
                поэтому текст с несколькими ссылками оборачиваем в span — иначе каждый фрагмент
                станет отдельным flex-item вместо обычного обтекания абзаца. */}
            <span>
              Я согласен с{' '}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:no-underline"
              >
                пользовательским соглашением
              </Link>{' '}
              и{' '}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:no-underline"
              >
                политикой обработки данных
              </Link>
            </span>
          </FieldLabel>
        </Field>
        <FieldError errors={errors.agreedToTerms ? [errors.agreedToTerms] : undefined} />

        {rootError && (
          <p role="alert" className="text-sm text-destructive">
            {rootError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
        </Button>
      </FieldGroup>
    </form>
  )
}
