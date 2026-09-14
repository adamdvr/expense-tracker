import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().min(1, 'Введите email').email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  // Необязательное поле; пустую строку превращаем в undefined перед отправкой в API.
  name: z.string(),
  agreedToTerms: z.boolean().refine((value) => value === true, {
    message: 'Нужно принять соглашение и политику, чтобы продолжить',
  }),
})

export type RegisterFormValues = z.infer<typeof registerSchema>
