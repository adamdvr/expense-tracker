# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Архитектура проекта

Это npm workspaces монорепозиторий с Turborepo для управления сборками. Проект состоит из двух основных приложений:

### Backend (apps/backend)
- **Фреймворк**: Nest.js 10 с TypeScript strict mode
- **База данных**: PostgreSQL через Prisma ORM
- **Документация API**: Swagger на `/api`
- **Порт**: 3001 (по умолчанию)

**Архитектурные детали:**
- `PrismaService` — глобальный модуль (`@Global()`) с управлением lifecycle (connect/disconnect)
- Все эндпоинты автоматически валидируются через `ValidationPipe` (whitelist + transform)
- CORS настроен на `FRONTEND_URL` env переменную, по умолчанию localhost:3000
- Swagger автоматически генерируется из декораторов `@Api*`

### Frontend (apps/frontend)
- **Фреймворк**: Next.js 15 с App Router
- **Архитектура**: Feature-Sliced Design (FSD) — см. раздел «Frontend: Feature-Sliced Design» ниже
- **UI-кит**: shadcn/ui (примитивы Base UI, пресет Nova) поверх Tailwind CSS v4
- **Стилизация**: CSS-переменные темы shadcn, смэппленные на палитру проекта в `globals.css`. Тема одна — тёмная, без переключателя (класс `dark` статически задан в `app/layout.tsx`)
- **Порт**: 3000 (по умолчанию)

**Архитектурные детали:**
- `src/app/` — роутинг Next.js (`page.tsx`/`layout.tsx`); одновременно выполняет роль FSD-слоя `app` (глобальные провайдеры, стили). Остальные FSD-слои — `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/`
- shadcn-компоненты ставятся в `src/shared/ui` (алиасы настроены в `components.json`, не дефолтный `src/components/ui`)
- API URL конфигурируется через `NEXT_PUBLIC_API_URL` env переменную

### Общее
- **TypeScript**: Строгий режим во всех проектах
- **Базовый tsconfig**: Корневой `tsconfig.json` расширяется в каждом приложении
- **Форматирование**: Prettier с конфигурацией без semicolons, single quotes

## Основные команды

### Monorepo уровень (из корня)
```bash
# Запуск всех приложений в dev режиме
npm run dev

# Сборка всех приложений
npm run build

# Линтинг всех приложений
npm run lint

# Type checking всех приложений
npm run typecheck

# Форматирование всего кода
npm run format
```

### Backend (из apps/backend)
```bash
# Разработка с hot reload
npm run dev

# Production сборка
npm run build

# Генерация Prisma Client (после изменения schema)
npm run prisma:generate

# Создание новой миграции
npm run prisma:migrate
# или с именем:
npx prisma migrate dev --name feature_name

# Применение миграций (production)
npx prisma migrate deploy

# Открыть Prisma Studio (GUI для БД)
npm run prisma:studio
```

### Frontend (из apps/frontend)
```bash
# Разработка с hot reload
npm run dev

# Production сборка
npm run build

# Запуск production версии
npm run start
```

## Работа с базой данных

**Schema location**: `apps/backend/prisma/schema.prisma`

**Workflow для изменения схемы:**
1. Отредактировать `schema.prisma`
2. Создать миграцию: `cd apps/backend && npx prisma migrate dev --name description`
3. Prisma Client автоматически обновится

**Важно**: 
- В schema закомментирована готовая модель для будущего: `Budget`
- Используется `cuid()` для ID вместо auto-increment (исключение — `Transaction` с `uuid()`)
- Папка `prisma/migrations/` хранится в git: миграция коммитится вместе с изменением схемы
- Все модели имеют `@@map()` для snake_case имен таблиц

## Docker окружение

```bash
# Запуск всех сервисов (PostgreSQL + backend + frontend)
docker-compose up -d

# Только PostgreSQL для локальной разработки
docker-compose up postgres -d

# Просмотр логов
docker-compose logs -f [service_name]

# Остановка всех сервисов
docker-compose down
```

**Database credentials** (в docker-compose):
- User: `tracker`
- Password: `tracker`
- Database: `tracker`
- Host: `localhost:5432`

## Environment переменные

### Backend (.env)
```
DATABASE_URL="postgresql://tracker:tracker@localhost:5432/tracker"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000  # для CORS
JWT_SECRET=change-me-in-production   # секрет для подписи JWT
JWT_EXPIRES_IN=3600s                 # срок жизни access token
```

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Добавление новых модулей NestJS

При создании новых модулей в backend:
1. Используйте Nest CLI: `nest generate module feature`
2. Инжектируйте `PrismaService` для доступа к БД (уже глобальный)
3. Добавляйте `@Api*` декораторы для Swagger документации
4. DTO классы должны иметь декораторы валидации из `class-validator`

## Frontend: Feature-Sliced Design

Frontend использует адаптацию [Feature-Sliced Design](https://feature-sliced.design/) под Next.js App Router:

```
src/
  app/          # Next.js routing (page.tsx, layout.tsx) + глобальные провайдеры/стили.
                # Совмещает роль FSD-слоя "app". Отдельного слоя "pages" нет —
                # эту роль выполняют тонкие page.tsx, которые просто собирают
                # widgets/features, без бизнес-логики внутри.
  widgets/      # Композитные блоки UI (напр. auth-layout — обёртка для страниц логина/регистрации)
  features/     # Пользовательские сценарии с логикой (напр. auth/login, auth/register)
  entities/     # Бизнес-сущности (напр. user, session)
  shared/       # Переиспользуемое: ui-кит (shadcn), api-клиент, config, lib
```

Правила:
- **Импорты только «сверху вниз»**: `app` → `widgets` → `features` → `entities` → `shared`. Слой не импортирует из слоя выше себя. Кросс-импорт между слайсами одного уровня (напр. `features/auth/login` → `features/auth/register`) не допускается — общая логика уходит на слой ниже (в примере с auth — в `entities/session`).
- **Публичный API через `index.ts`**: импортировать можно только из корня слайса (`@/entities/session`), а не из его внутренних файлов (`@/entities/session/model/storage`).

### UI-кит (shadcn/ui)

- Компоненты ставятся командой `npx shadcn add <component>` из `apps/frontend` — алиасы в `components.json` настроены так, что файлы попадают сразу в `src/shared/ui` (а не в дефолтный `src/components/ui`).
- Текущая версия shadcn CLI (4.x) использует **Base UI** (`@base-ui/react`) как примитивы вместо Radix UI, и отдельный пакет `cn` вместо локальной склейки `clsx`+`tailwind-merge`. Пресет — Nova (`base-nova`), базовый цвет — `neutral`.
- Готового `Form`-компонента (react-hook-form через контекст) в реестре больше нет — вместо него примитивы `Field`/`FieldGroup`/`FieldLabel`/`FieldError` (`shared/ui/field.tsx`), которые собираются вручную вокруг `useForm()`. `FieldError` принимает `errors` в формате react-hook-form (`{ message }[]`).
- Тема только тёмная (без переключателя): цветовые токены shadcn (`--background`, `--primary`, `--border` и т.д.) заданы в блоке `.dark` в `globals.css`, смэпплены на палитру проекта (`--surface-*`, `--brand`, `--text-*`); класс `dark` статически зафиксирован на `<html>` в `app/layout.tsx`.

## Добавление новых страниц Next.js

В App Router:
1. Создайте `page.tsx` в соответствующей директории `src/app/` — держите его тонким: только сборка из `widgets`/`features`, без бизнес-логики и запросов к API внутри самого `page.tsx`.
2. Бизнес-логику (запросы к API, формы, валидация, состояние) выносите в `features/<домен>/<сценарий>` или `entities/<сущность>`.
3. Для API роутов: создайте `route.ts` вместо `page.tsx`
4. UI собирайте из `shared/ui` (shadcn) и Tailwind-утилит; для новых shadcn-компонентов — `npx shadcn add <component>`

## Turborepo кэширование

Turborepo кэширует результаты задач. Важные детали:
- `dev` задачи не кэшируются (`cache: false`)
- `build` кэширует outputs: `.next/`, `dist/`
- Кэш хранится в `.turbo/` (в gitignore)
- Env файлы отслеживаются как `globalDependencies`

## Git: соглашение о коммитах

Коммиты оформляются по [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <описание>

- что сделано и зачем (опционально, списком)
```

- **type**: `feat` — новая функциональность, `fix` — исправление бага, `refactor` — рефакторинг без изменения поведения, `perf` — производительность, `docs` — документация, `style` — форматирование, `test` — тесты, `build` — сборка и зависимости, `ci` — CI, `chore` — прочее (конфиги, служебные файлы)
- **scope** (опционально): модуль или слайс, который затрагивает изменение — `transactions`, `categories`, `auth`, `frontend`, `prisma` и т.п.
- **описание**: на русском, в инфинитиве («добавить», «исправить»), с маленькой буквы, без точки в конце, до ~72 символов
- **тело**: через пустую строку, коротким списком — что изменилось и почему
- **breaking change**: `!` после scope (`feat(auth)!: ...`) и футер `BREAKING CHANGE: <что сломалось>`

Правила:
- Один коммит — одна логическая единица (фича, фикс). Не смешивать фичу с посторонними правками
- Миграция Prisma коммитится в том же коммите, что и изменение `schema.prisma`
- Перед коммитом проходят `npm run typecheck`, `npm run lint` и `npm run build`
- Не коммитить `.env*` (кроме `.env.example`) и `.claude/settings.local.json`

Пример:
```
feat(transactions): добавить модуль учёта доходов и расходов

- модель Transaction и миграция add-transactions
- CRUD /transactions с фильтрами и сводкой /transactions/summary
- запрет удаления категории с транзакциями (409)
```
