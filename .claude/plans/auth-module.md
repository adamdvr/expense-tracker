# План: Авторизация через JWT (модули User + Auth)

## Решения (согласовано)
- **Регистрация** возвращает JWT сразу (авто-логин): `POST /auth/register` → `{ access_token, user }`.
- **Поле хэша пароля**: `passwordHash` в модели (в БД — `password_hash`).

## 1. Зависимости (apps/backend/package.json)
Добавить:
- `@nestjs/jwt` — генерация/верификация JWT
- `@nestjs/passport`, `passport`, `passport-jwt` — стратегия JWT + guard
- `@nestjs/config` — чтение `JWT_SECRET`/`JWT_EXPIRES_IN` из env
- `bcrypt` (+ `@types/bcrypt` в devDependencies) — хэширование паролей

Установка: `cd apps/backend && npm install`.

## 2. Prisma schema (apps/backend/prisma/schema.prisma)
Расширить модель `User`:
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("users")
}
```
Миграция: `npx prisma migrate dev --name add_user_auth`.

## 3. Env
- `.env` и `CLAUDE.md`: добавить `JWT_SECRET` и `JWT_EXPIRES_IN` (напр. `3600s`).

## 4. Модуль User (apps/backend/src/user/)
- `user.repository.ts` — инкапсулирует доступ к БД через `PrismaService`:
  `create`, `findByEmail`, `findById`.
- `user.service.ts` — бизнес-логика поверх репозитория (создание с проверкой уникальности email, получение).
- `entities/user.entity.ts` — представление пользователя для ответов (без `passwordHash`).
- `user.module.ts` — экспортирует `UserService` для использования в AuthModule.

## 5. Модуль Auth (apps/backend/src/auth/)
- `dto/register.dto.ts` — `email` (IsEmail), `password` (MinLength(6)), `name?` (IsString, optional).
- `dto/login.dto.ts` — `email`, `password`.
- `auth.service.ts`:
  - `register` — хэширует пароль (bcrypt), создаёт пользователя через UserService, возвращает `{ access_token, user }`.
  - `login` — находит по email, сверяет пароль (bcrypt.compare), возвращает `{ access_token, user }`.
  - `validateUser` / формирование JWT payload `{ sub: id, email }`.
- `auth.controller.ts` — `POST /auth/register`, `POST /auth/login`, с `@Api*` декораторами Swagger.
- `strategies/jwt.strategy.ts` — Passport JWT стратегия (Bearer, secret из ConfigService).
- `guards/jwt-auth.guard.ts` — `JwtAuthGuard` для защиты будущих эндпоинтов.
- `decorators/current-user.decorator.ts` — `@CurrentUser()` для извлечения пользователя из request (удобство).
- `auth.module.ts` — импортирует `UserModule`, `JwtModule.registerAsync` (ConfigService), `PassportModule`.

## 6. Интеграция
- `app.module.ts` — добавить `ConfigModule.forRoot({ isGlobal: true })`, `UserModule`, `AuthModule`.
- `main.ts` — добавить `.addBearerAuth()` в Swagger DocumentBuilder.

## 7. Проверка
- `npm run typecheck` и `npm run build` в apps/backend.
- (При доступной БД) миграция + ручная проверка register/login.

## Безопасность
- `passwordHash` никогда не возвращается в ответах (маппинг в UserEntity / select).
- Одинаковая ошибка при неверном email/пароле в login (401), чтобы не раскрывать существование email.
