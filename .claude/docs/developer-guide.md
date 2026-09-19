# Гайд для разработчиков

> **Документация:** [Архитектура](architecture.md) · [API](api.md) · [База данных](database.md) · Гайд разработчика
>
> Как поднять проект, куда класть код, как добавлять фичи и что делать, когда что-то не работает. Обязательные правила проекта (git-flow, коммиты, соглашения) — в `CLAUDE.md`, `apps/backend/CLAUDE.md`, `apps/frontend/CLAUDE.md`; правила ревью — в `REVIEW.md`.

---

## 1. Требования

| Инструмент | Версия | Зачем |
|---|---|---|
| Node.js | ≥ 20 (`engines` в корневом `package.json`) | Backend и frontend |
| npm | 10 (`packageManager: npm@10.9.2`) | npm workspaces; pnpm и yarn не используются |
| Docker + Docker Compose | любая актуальная | PostgreSQL для локальной разработки |
| Git, GitHub CLI (`gh`) | — | Ветки и Pull Request-ы (PR создаются через `gh pr create`) |

---

## 2. Быстрый старт

```bash
# 1. Зависимости всех приложений ставятся из корня (npm workspaces)
npm install

# 2. Переменные окружения
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# 3. PostgreSQL в Docker (только БД)
docker-compose up postgres -d

# 4. Миграции + генерация Prisma Client
cd apps/backend && npx prisma migrate dev && cd ../..

# 5. Backend (:3001) и frontend (:3000) одновременно, через turbo
npm run dev
```

Шаг 4 обязателен. `npm install` из корня не генерирует Prisma Client: postinstall-хук `@prisma/client` ищет схему в корне репозитория, а она лежит в `apps/backend/prisma/`. Предупреждение `@prisma/client needs a schema.prisma to function, but couldn't find it` при установке ожидаемо. Без генерации backend не соберётся — в `@prisma/client` не будет моделей.

**Проверка**

| Что | Где |
|---|---|
| Frontend | http://localhost:3000 — без сессии перенаправит на `/login` |
| Health-check API | http://localhost:3001 → `{"status":"ok",…}` |
| Swagger UI | http://localhost:3001/api |

**Первый вход.** Зарегистрируйтесь на `/register`. В UI пока нет управления категориями (`/categories` — заглушка), а без категории форма создания транзакции не сохраняется. Первые категории создайте через Swagger: **Authorize** → вставить `access_token` → `POST /categories`. Токен можно взять из ответа `POST /auth/login` или из `localStorage` браузера — ключ `tracker:session`, поле `accessToken`.

---

## 3. Команды

**Из корня** (запускают задачу во всех приложениях через Turborepo)

| Команда | Что делает |
|---|---|
| `npm run dev` | Backend (`nest start --watch`) и frontend (`next dev`) в режиме разработки |
| `npm run build` | Production-сборка обоих приложений |
| `npm run lint` | ESLint в обоих приложениях |
| `npm run typecheck` | `tsc --noEmit` в обоих приложениях |
| `npm run format` | Prettier по всему репозиторию (`**/*.{ts,tsx,md,json}`) |

Одно приложение: `npm run dev -w @tracker/backend` или `npm run dev -w @tracker/frontend` (то же для `build`, `lint`, `typecheck`).

**Backend** (`apps/backend`)

| Команда | Что делает |
|---|---|
| `npm run dev` | Hot reload (`nest start --watch`) |
| `npm run build` / `npm run start` | Сборка в `dist/` / запуск `node dist/main` |
| `npm run prisma:generate` | Перегенерировать Prisma Client |
| `npm run prisma:migrate` | `prisma migrate dev` — создать и применить миграцию |
| `npx prisma migrate dev --name <имя>` | То же с именем миграции |
| `npx prisma migrate deploy` | Применить готовые миграции без создания новых |
| `npm run prisma:studio` | GUI для данных |

**Frontend** (`apps/frontend`)

| Команда | Что делает |
|---|---|
| `npm run dev` / `npm run build` / `npm run start` | Dev-сервер / production-сборка / запуск production-сборки |
| `npx shadcn add <component>` | Добавить компонент shadcn/ui в `src/shared/ui` |

---

## 4. Переменные окружения

`.env` игнорируется git-ом; в репозитории лежат только `.env.example`. Значения в процессе окружения имеют приоритет над `.env`: например, `PORT=3002 npm run dev -w @tracker/backend` переопределит порт.

**Backend** — `apps/backend/.env`

| Переменная | Обязательна | По умолчанию | Назначение и поведение |
|---|---|---|---|
| `DATABASE_URL` | да | — | Подключение Prisma к PostgreSQL. Без доступной БД backend не стартует |
| `PORT` | нет | `3001` | Порт HTTP-сервера |
| `NODE_ENV` | нет | `development` | Сейчас используется только в ответе `GET /version` |
| `FRONTEND_URL` | нет | `http://localhost:3000` | Единственный разрешённый CORS origin — задаётся строкой, не списком |
| `JWT_SECRET` | **да** | — | Секрет подписи JWT. Без него backend падает на старте: `JwtStrategy requires a secret or key`. В production — длинная случайная строка |
| `JWT_EXPIRES_IN` | **да** | — | Срок жизни токена — **строка с единицей измерения**: `3600s`, `1h`, `7d`. Значение из env всегда строка, а строка без единицы трактуется как миллисекунды: `JWT_EXPIRES_IN=3600` даст токен на 3 секунды. Без переменной `POST /auth/login` и `/auth/register` падают с 500: `"expiresIn" should be a number of seconds or string representing a timespan` |

**Frontend** — `apps/frontend/.env`

| Переменная | Обязательна | По умолчанию | Назначение |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | нет | `http://localhost:3001` | Базовый URL API. Встраивается в клиентский бандл, поэтому после изменения нужно перезапустить `next dev` или пересобрать проект |

---

## 5. Где что лежит

Подробно устройство описано в [архитектуре](architecture.md). Короткая шпаргалка:

| Задача | Куда |
|---|---|
| Новый эндпоинт или ресурс API | `apps/backend/src/<модуль>/` — controller, service, repository, `dto/`, `entities/` |
| Изменение таблиц | `apps/backend/prisma/schema.prisma` + новая миграция в `apps/backend/prisma/migrations/` |
| Новая авторизованная страница | `apps/frontend/src/app/(dashboard)/<маршрут>/page.tsx` + пункт меню в `widgets/app-shell/config/navigation.ts` |
| Типы сущности и загрузка данных | `apps/frontend/src/entities/<сущность>/` (`model/types.ts`, `api/`) |
| Пользовательский сценарий (форма, мутация) | `apps/frontend/src/features/<домен>/<сценарий>/` |
| Композитный блок страницы | `apps/frontend/src/widgets/<виджет>/` |
| UI-компонент, утилиты, HTTP-клиент | `apps/frontend/src/shared/` (`ui/`, `lib/`, `api/`) |

---

## 6. Рецепты

### 6.1. Новый ресурс на backend

**Образец — модуль `apps/backend/src/categories/`**: он небольшой и содержит все слои. Ниже — пример на условной сущности `Budget`.

1. **Модуль.** `cd apps/backend && npx nest generate module budgets` — CLI сам добавит модуль в `imports` `AppModule`.
2. **Repository** (`budgets.repository.ts`) — единственный класс, который инжектирует `PrismaService`. Чтение по id всегда с фильтром по владельцу:
   ```ts
   findByIdAndUser(id: string, userId: string): Promise<Budget | null> {
     return this.prisma.budget.findFirst({ where: { id, userId } })
   }
   ```
3. **Service** — перед любым `update(id, …)` и `delete(id)` проверяет владение. ID связанных ресурсов из тела запроса (как `categoryId`) проверяются так же:
   ```ts
   async remove(id: string, userId: string): Promise<Budget> {
     await this.findOwnedOrThrow(id, userId)
     return this.budgetsRepository.delete(id)
   }

   private async findOwnedOrThrow(id: string, userId: string): Promise<Budget> {
     const budget = await this.budgetsRepository.findByIdAndUser(id, userId)
     if (!budget) {
       throw new NotFoundException('Бюджет не найден') // 404, а не 403 — не раскрываем чужие данные
     }
     return budget
   }
   ```
4. **Controller** — guard вручную (глобального нет!), пользователь только из токена, ответ через Entity:
   ```ts
   @ApiTags('budgets')
   @ApiBearerAuth()
   @UseGuards(JwtAuthGuard)
   @Controller('budgets')
   export class BudgetsController {
     constructor(private readonly budgetsService: BudgetsService) {}

     @Delete(':id')
     @HttpCode(HttpStatus.NO_CONTENT)
     @ApiOperation({ summary: 'Удаление бюджета' })
     @ApiResponse({ status: 204, description: 'Бюджет удалён' })
     @ApiResponse({ status: 404, description: 'Бюджет не найден' })
     async remove(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
       await this.budgetsService.remove(id, user.id)
     }
   }
   ```
   Статические пути (например, `summary`) объявляйте **раньше** `:id`, иначе Nest примет их за id.
5. **DTO** — у каждого поля декоратор `class-validator` и `@ApiProperty`. Поле без валидатора глобальный `ValidationPipe` отклонит с 400. DTO для изменения — `PartialType` из `@nestjs/swagger`. Учтите, что он пропускает `null` и в обязательном поле это превратится в 500 (см. [API → ограничения](api.md#10-известные-ограничения)).
6. **Entity** — класс с явным перечнем полей и `@ApiProperty`, собирается из Prisma-модели в конструкторе. `Prisma.Decimal` отдаётся как `.toFixed(2)`. Секретные поля в Entity не включаются.
7. **Деньги** — только `Prisma.Decimal` (`.plus()`, `.minus()`), без приведения к `number`.
8. **Frontend и документация** — обновите типы и zod-схемы на frontend (общих типов нет) и `.claude/docs/api.md`.

### 6.2. Изменение схемы БД

1. Правка `apps/backend/prisma/schema.prisma`. Для новых колонок-связей используйте `@map("snake_case")`, а для поиска по владельцу добавьте `@@index([userId])`.
2. `cd apps/backend && npx prisma migrate dev --name add_budgets` — создаст `migration.sql`, применит его и перегенерирует клиент.
3. Прочитайте сгенерированный SQL. Отдельное внимание — `DROP`, переименованиям (Prisma делает их как DROP + ADD с потерей данных), `NOT NULL` без `DEFAULT` и новым `UNIQUE`.
4. Схема и миграция коммитятся **в одном коммите**. Применённые миграции не редактируются.

Подробности, соглашения об именах колонок и история миграций — в [документе о БД](database.md#9-миграции).

### 6.3. Новая страница на frontend

Авторизованная страница — внутри route group `(dashboard)`: её автоматически оборачивает `AppShell`, который проверяет сессию и рисует меню. `page.tsx` остаётся тонким — метаданные и сборка из виджетов, без запросов и бизнес-логики. Пример на условном разделе «Бюджеты»:

```tsx
// apps/frontend/src/app/(dashboard)/budgets/page.tsx
import type { Metadata } from 'next'

import { BudgetsList } from '@/widgets/budgets-list'

export const metadata: Metadata = {
  title: 'Бюджеты — Трекер расходов',
}

export default function BudgetsPage() {
  return <BudgetsList />
}
```

Пункт меню добавляется в `NAVIGATION_ITEMS` (`apps/frontend/src/widgets/app-shell/config/navigation.ts`). Заголовок страницы (`h1` в панели контента) берётся оттуда же. Публичные страницы (как `/login`) кладутся вне `(dashboard)`.

### 6.4. Загрузка данных с API (entity)

Образец — `apps/frontend/src/entities/transaction/` и `entities/category/`.

```ts
// entities/budget/model/types.ts — зеркало BudgetEntity с backend
export interface Budget {
  id: string
  name: string
  amount: string // Decimal приходит строкой
  // …
}

// entities/budget/api/budget-api.ts — функция запроса + фабрика ключей
export const budgetKeys = {
  all: ['budgets'] as const,
  list: () => [...budgetKeys.all, 'list'] as const,
}

export function fetchBudgets(): Promise<Budget[]> {
  return apiClient.get<Budget[]>('/budgets')
}

// entities/budget/api/use-budgets.ts — query-хук
export function useBudgets() {
  return useQuery({ queryKey: budgetKeys.list(), queryFn: fetchBudgets })
}

// entities/budget/index.ts — публичный API слайса
export type { Budget } from './model/types'
export { budgetKeys, fetchBudgets } from './api/budget-api'
export { useBudgets } from './api/use-budgets'
```

- Токен, таймаут и разбор ошибок `apiClient` делает сам — не вызывайте `fetch` напрямую.
- В `apiClient` пока только `get` и `post`. Если нужны `PATCH` или `DELETE`, добавьте методы в `apps/frontend/src/shared/api/client.ts` рядом с существующими — через общую функцию `request()`. Пустое тело ответа (`204`) она превращает в `null`.
- Ключи кэша не содержат id пользователя: при смене пользователя кэш очищается целиком в `app/providers.tsx`. Новая сущность под это правило попадает автоматически.

### 6.5. Пользовательский сценарий: мутация и форма (feature)

Образец — `apps/frontend/src/features/transaction/create/`.

```ts
// features/budget/create/api/use-create-budget.ts
export function useCreateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBudget,
    // инвалидируем по корневому ключу сущности — обновятся все списки
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all }),
  })
}
```

Форма:
- zod-схема в `model/schema.ts` повторяет правила DTO backend. Значения поля храните в том виде, в каком их вводит пользователь (строкой), а в payload API переводите отдельной функцией `to…Payload()`.
- `useForm({ resolver: zodResolver(schema) })` и примитивы `Field`, `FieldLabel`, `FieldError` из `@/shared/ui/field` — готового компонента `Form` нет.
- Ошибка сервера: `setRootError(getApiErrorMessage(error))` из `@/shared/api`.
- Кнопка отправки блокируется, пока идёт запрос. От двойного клика защищает синхронный `ref`-флаг, как в `create-transaction-form.tsx`.
- Даты: `<input type="date">` → `dateInputToIso()` (полночь UTC); отображение — `formatDate()` (в UTC). Суммы: в API отправляется число, выводятся через `formatMoney()`. Итоги из `number` на клиенте не считаются — их даёт `/transactions/summary`.

### 6.6. UI-компоненты и стили

- Новый компонент shadcn: `cd apps/frontend && npx shadcn add <component>`. Благодаря алиасам в `components.json` файл попадёт в `src/shared/ui`, хуки — в `src/shared/hooks`.
- Примитивы — **Base UI**, не Radix. Вместо `asChild` используется проп `render`: `<SidebarMenuButton render={<Link href="/" />}>`.
- Цвета — только через токены темы, без «сырых» Tailwind-цветов вроде `text-emerald-400`:

  | Класс | Для чего |
  |---|---|
  | `bg-background`, `bg-card`, `bg-muted` | Фоны: страница, карточки, приглушённые блоки |
  | `text-foreground`, `text-muted-foreground` | Основной и второстепенный текст |
  | `bg-primary`, `text-primary-foreground` | Основная кнопка и тёмные элементы (`--ink`) |
  | `bg-canvas`, `bg-mint`, `bg-periwinkle`, `bg-peach` | Фон страницы и пастельные заливки (доход / нейтральное / расход) |
  | `text-destructive` | Ошибки |
  | `text-income` | Суммы доходов |
  | `border-border` | Границы |

- Новый токен: цвет в палитру `:root` (`apps/frontend/src/app/globals.css`) → сопоставление токена shadcn (тоже в `:root`) → `--color-<имя>` в `@theme inline`, после чего появится класс `text-<имя>` / `bg-<имя>`. Тема только светлая, `dark:`-варианты не используются.
- Иконки — `lucide-react`. Объединение классов — `cn()` из `@/shared/lib/utils`.

---

## 7. Соглашения по коду

- **Форматирование** — Prettier (`.prettierrc.json`): без точек с запятой, одинарные кавычки, ширина строки 100, `trailingComma: "es5"`, отступ 2 пробела. Форматирование не обсуждается на ревью — запускайте `npm run format`.
- **Линтинг** — backend: `eslint:recommended` + `@typescript-eslint/recommended` (`no-explicit-any` — предупреждение). Frontend: `next/core-web-vitals`. Правила FSD линтер **не проверяет**.
- **TypeScript** — `strict` и `noUncheckedIndexedAccess`: `items[0]` имеет тип `T | undefined`, это нужно обрабатывать явно.
- **Импорты** — backend использует относительные пути (алиас `@/*` объявлен в tsconfig, но не используется). Frontend: между слоями и слайсами — `@/…` и только через публичный `index.ts` слайса; внутри слайса — относительные пути (`'../model/schema'`).
- **Именование** — файлы в kebab-case (`create-transaction-form.tsx`, `use-transactions.ts`), компоненты в PascalCase, хуки `useXxx`. На backend файлы называются `<модуль>.<слой>.ts` (`transactions.service.ts`), DTO — `*.dto.ts`, ответы — `*.entity.ts`.
- **Client и Server Components** — `'use client'` ставится только там, где нужны состояние, эффекты, обработчики или браузерные API. `page.tsx` и `layout.tsx` остаются серверными.
- **Язык** — тексты UI, бизнес-ошибки API, комментарии и коммиты на русском; идентификаторы в коде — на английском.
- **Комментарии** — объясняют «почему» (неочевидное ограничение, обход бага), а не «что».

---

## 8. Git, коммиты и Pull Request

Полные правила веток — в корневом `CLAUDE.md`, правила коммитов — в skill `.claude/skills/commit/SKILL.md` (`/commit`), создание PR — в skill `.claude/skills/pr/SKILL.md` (`/pr`). Коротко:

1. `master` всегда рабочий, напрямую в него не коммитят. Каждая задача — отдельная ветка от актуального `master`: `<type>/<scope>-<описание>`, например `feat/frontend-budgets`, `fix/auth-token-refresh`, `docs/claude-docs`.
2. Коммиты — [Conventional Commits](https://www.conventionalcommits.org/) на русском, в инфинитиве: `feat(transactions): добавить фильтр по категории`. Breaking change помечается `!` и футером `BREAKING CHANGE: …`. Миграция Prisma идёт в одном коммите со схемой.
3. **Перед коммитом** должны проходить `npm run typecheck`, `npm run lint` и `npm run build`. CI их **не запускает**, так что проверка лежит на авторе.
4. Перед PR ветка актуализируется относительно `master` (rebase или merge), конфликты решаются в ветке. PR создаётся через `/pr [--title "<заголовок>"] [--branch <ветка>]` (`gh pr create`), тело — `## Summary` / `## Почему` / `## Test plan`.
5. На каждый PR автоматически запускается код-ревью Claude (`.github/workflows/claude-code-review.yml`). Упоминание `@claude` в комментарии вызывает Claude для любого запроса. Правила ревью — `REVIEW.md`.
6. После слияния ветка удаляется.

**Папка `.claude/`** хранит рабочие материалы для Claude Code:

| Путь | Содержимое |
|---|---|
| `.claude/docs/` | Эта документация |
| `.claude/plans/` | Планы фич с чек-листами задач (`home-page.md`, `transactions.md`, …) — история того, как и почему строились фичи |
| `.claude/settings.json` | Общие права Claude Code: `git push` и `gh pr create` всегда требуют подтверждения, force push запрещён |
| `.claude/skills/commit/` | Skill `/commit`: коммит в ветку по правилам проекта (Conventional Commits, проверки, что не коммитить) |
| `.claude/skills/pr/` | Skill `/pr [--title "<заголовок>"] [--branch <ветка>]` (только ручной вызов): создание PR в `master` — актуализация ветки, проверки, push, заголовок по Conventional Commits, описание Summary/Почему/Test plan |
| `.claude/skills/standup/` | Skill `/standup [YYYY-MM-DD]` (только ручной вызов): короткий отчёт (пара абзацев) о сделанном за вчера или за указанный день |
| `.claude/skills/test/` | Skill `/test <путь к файлу>` (только ручной вызов): unit-тест на файл backend или frontend — проверка тестовой инфраструктуры, тест рядом с файлом, прогон теста, typecheck и lint |
| `.claude/templates/feature.md` | Шаблон промпта для новой фичи |
| `.claude/prompts/`, `.claude/tasks/` | Использованные промпты и чек-листы задач |

---

## 9. Проверка изменений

Unit-тесты есть только в backend: Jest, файлы `*.spec.ts` рядом с кодом, запуск — `npm run test -w @tracker/backend`. Пока покрыт только `TransactionsService`. Во frontend тестового раннера нет. Skill `/test <путь к файлу>` пишет unit-тест на файл; для frontend он остановится и предложит сначала настроить Vitest отдельной задачей. Минимальная проверка любого изменения:

1. `npm run typecheck && npm run lint && npm run build` из корня; при изменениях в backend — ещё `npm run test -w @tracker/backend`.
2. **Backend** — через Swagger (http://localhost:3001/api) или curl:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"user@example.com","password":"password123"}' \
     | node -e "let s = ''; process.stdin.on('data', (d) => (s += d)).on('end', () => console.log(JSON.parse(s).access_token))")

   curl -s "http://localhost:3001/transactions?page=1&limit=5" -H "Authorization: Bearer $TOKEN"
   ```
   Для user-scoped ресурсов проверьте и негативный сценарий: второй пользователь не должен видеть или менять чужие данные — ожидается 404.
3. **Frontend** — пройти сценарий в браузере: вход → главная → создание транзакции → пагинация. Отдельно проверьте ошибки — остановленный backend, неверные данные в форме.

---

## 10. Отладка: частые проблемы

| Симптом | Причина | Решение |
|---|---|---|
| `tsc` во frontend падает на файлах `.next/types/…` (`Cannot find module '…/page.js'`) после удаления или переноса страницы | Устаревшие сгенерированные типы Next.js | `rm -rf apps/frontend/.next`, затем повторить команду |
| Backend не компилируется: в `@prisma/client` нет моделей, например `has no exported member 'User'` | Prisma Client не сгенерирован (после `npm install` из корня он не генерируется) | `cd apps/backend && npx prisma generate` |
| `Can't reach database server at localhost:5432` | PostgreSQL не запущен | `docker-compose up postgres -d`; проверить `docker ps` (контейнер `tracker-db`) |
| Backend падает на старте с `JwtStrategy requires a secret or key` | Нет `JWT_SECRET` | Создать `apps/backend/.env` из `.env.example` |
| Вход и регистрация отвечают 500 | Нет `JWT_EXPIRES_IN` | Добавить `JWT_EXPIRES_IN=3600s` в `apps/backend/.env` |
| `EADDRINUSE: address already in use :::3001` | Порт занят другим процессом | `lsof -nP -iTCP:3001 -sTCP:LISTEN`; либо запустить на другом порту (`PORT=3002 npm run dev -w @tracker/backend`) и поменять `NEXT_PUBLIC_API_URL` |
| В браузере CORS-ошибка | Frontend открыт не с того origin, что указан в `FRONTEND_URL` (например, `127.0.0.1` вместо `localhost` или другой порт) | Открывать ровно `FRONTEND_URL` или поменять его и перезапустить backend |
| Внезапный редирект на `/login` | Токен истёк (по умолчанию через час) → 401 → сессия сброшена | Войти заново — refresh-токена нет |
| `400 property X should not exist` | В body или query есть поле, которого нет в DTO (`forbidNonWhitelisted`) | Убрать поле или добавить его в DTO с валидатором |
| `500` на `PATCH` | В обязательное поле передан `null` | Не передавать поле вообще (см. [API → ограничения](api.md#10-известные-ограничения)) |
| Изменение `NEXT_PUBLIC_API_URL` не подхватилось | Переменная встроена в бандл при старте или сборке | Перезапустить `npm run dev` / пересобрать |
| Форма транзакции: «Сначала создайте категорию» | У пользователя нет категорий, а в UI их пока нельзя создать | Создать через Swagger: `POST /categories` |
| Дата транзакции отображается на день раньше | Дата отформатирована в локальном часовом поясе | Использовать `formatDate()` из `shared/lib/format.ts` (UTC) |

---

## 11. Известные проблемы и ограничения

Состояние на момент написания документа. Исправления делаются отдельными задачами и ветками.

**Инфраструктура**
- **Полный стек в Docker не собирается.** `docker-compose up` падает на `npm ci` (`EUSAGE`): `Dockerfile` в `apps/backend` и `apps/frontend` копирует только `package*.json` приложения, а `package-lock.json` есть только в корне монорепозитория. Кроме того, в `docker-compose.yml` backend-контейнеру через `environment` передаются только `DATABASE_URL`, `PORT` и `NODE_ENV`. `JWT_SECRET`, `JWT_EXPIRES_IN` и `FRONTEND_URL` попадут в контейнер только из смонтированного каталога — то есть если на хосте есть `apps/backend/.env`. Рабочий режим — БД в Docker, приложения на хосте ([раздел 2](#2-быстрый-старт)).
- **Автотестов почти нет**: в backend покрыт только `TransactionsService`, во frontend тестового раннера нет. В CI не запускаются ни тесты, ни `typecheck`, `lint` и `build` — только ИИ-ревью.
- **`README.md` устарел**: упоминает несуществующий скрипт `npm run install:all`, «CSS без внешних библиотек» и модели `Expense` и `Category` как будущие. Ориентируйтесь на `CLAUDE.md` и эту документацию.

**Frontend**
- Разделы `/transactions` и `/categories` — заглушки. Категории создаются только через API.
- Нет кнопки выхода: сессия сбрасывается только при 401.
- `/login` и `/register` не перенаправляют уже вошедшего пользователя.
- Поле `icon` категории не используется в UI.
- Правила FSD не проверяются линтером.

**Backend и API** (подробнее — в [API → ограничения](api.md#10-известные-ограничения))
- `null` в обязательных полях `PATCH` даёт 500 вместо 400.
- Email чувствителен к регистру.
- Одновременная регистрация с одним email может дать 500 вместо 409.
- Нет refresh-токена, logout и rate limiting.
- `GET /` не проверяет доступность БД.

**Безопасность**
- JWT хранится в `localStorage`, поэтому любой XSS равнозначен краже токена. React экранирует обычный вывод `{value}`, но появление `dangerouslySetInnerHTML`, прямых вставок в DOM или непроверенных `href`/`src` требует особого внимания на ревью.
