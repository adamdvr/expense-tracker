# План: главный экран трекера расходов (dashboard)

> При реализации этот план копируется в `.claude/plans/home-page.md`, чеклист отмечается по ходу.
> Выполняем по одному пункту за раз, с подтверждением перед следующим. Ветка — текущая `feat/frontend-home-page`.

## Context
Сейчас `/` — статичный лендинг-заглушка (CSS-классы `.hero`, `.feature-card` в `globals.css`), куда редиректят логин/регистрация. Нужен рабочий главный экран:
- боковое меню: «Главная», «Транзакции», «Категории»;
- профиль пользователя в меню;
- список транзакций с пагинацией по 10;
- создание транзакции в диалоге с обновлением списка.

Что мешает сейчас:
- `GET /transactions` отдаёт все записи массивом, без `page`/`limit`. Лишние query-параметры бэкенд отклоняет с 400 (`forbidNonWhitelisted`).
- `apiClient` не отправляет `Authorization`, а все `/transactions` и `/categories` закрыты `JwtAuthGuard`.
- Нет библиотеки загрузки данных, нет shadcn-компонентов для меню, диалога и select.
- `TransactionEntity` содержит только `categoryId`. Название и цвет категории берём джойном с `GET /categories` на клиенте.

Решения пользователя:
- пагинация на бэкенде;
- `/transactions` и `/categories` пока заглушки;
- загрузка данных через TanStack Query;
- из доп. блоков — только создание транзакции.

## Архитектурные решения

**Backend: пагинация `GET /transactions`** (breaking change контракта, фронт его ещё не использует)
- `FindTransactionsQueryDto`: `page` (`@Type(() => Number) @IsInt() @Min(1)`, по умолчанию 1) и `limit` (`@IsInt() @Min(1) @Max(100)`, по умолчанию 10).
- Новый `entities/paginated-transactions.entity.ts` с полями `{ items: TransactionEntity[], total, page, limit, totalPages }` и Swagger-декораторами.
- `TransactionsRepository.findAllByUser` → `prisma.$transaction([findMany({ where, orderBy, skip, take }), count({ where })])`. Возвращает `{ items, total }`, `where` и сортировка прежние.
- Сервис и контроллер собирают `PaginatedTransactionsEntity`. Коммит `feat(transactions)!: ...` с футером `BREAKING CHANGE`.

**Frontend: токен в запросах без нарушения FSD.** `shared` не может импортировать `entities/session`, поэтому:
- в `shared/api/client.ts` добавить `setAuthTokenGetter(fn: () => string | null)`, `request()` подставляет `Authorization: Bearer <token>`;
- функцию подключает слой `app` в провайдере через `getSession()?.accessToken`.

**Data fetching.** Зависимость `@tanstack/react-query`. `app/providers.tsx` (`'use client'`) создаёт `QueryClient` в `useState` и регистрирует getter токена, `app/layout.tsx` оборачивает `children`. Хуки лежат в `entities/*/api`, мутация — в `features`.

**Роутинг.** Route group `app/(dashboard)/` с `layout.tsx` → `<AppShell>`:
- `(dashboard)/page.tsx` → `/`, замещает лендинг;
- `(dashboard)/transactions/page.tsx` и `(dashboard)/categories/page.tsx` — заглушки «Раздел в разработке».

Старый `app/page.tsx` и CSS лендинга (`.container`, `.hero`, `.features`, `.feature-card`, `.status` и media query) удаляются.

**Сессия на клиенте.** В `entities/session` добавить `useSession()`: `useSyncExternalStore` поверх localStorage, на сервере `null`, без hydration mismatch. `AppShell` при отсутствии сессии делает `router.replace('/login')`. Это минимально необходимо, иначе dashboard без токена сыплет 401. Полноценный guard (обработка 401, logout) — вне скоупа.

**Даты и суммы.**
- Дата из `<input type="date">` отправляется как `YYYY-MM-DDT00:00:00.000Z`, отображается через `Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC' })`: бэкенд считает месяцы в UTC, так дата не съезжает на день.
- `amount` приходит строкой и форматируется `Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })`.
- Доход — `+` зелёным (`text-emerald-400`), расход — `−` обычным цветом.

**Иконка категории.** Бэкенд хранит в `icon` имя вроде `shopping-cart`. В списке показываем кружок цвета `category.color` с первой буквой названия. Динамические lucide-иконки — отдельной задачей.

## Структура (новое)
```
apps/backend/src/transactions/
  dto/find-transactions-query.dto.ts         # + page, limit
  entities/paginated-transactions.entity.ts  # новый
  transactions.repository.ts / .service.ts / .controller.ts

apps/frontend/src/
  app/providers.tsx                       # QueryClientProvider + setAuthTokenGetter
  app/layout.tsx                          # обёртка <Providers>
  app/(dashboard)/layout.tsx              # <AppShell>
  app/(dashboard)/page.tsx                # TransactionsList (кнопка создания — внутри виджета)
  app/(dashboard)/transactions/page.tsx   # заглушка
  app/(dashboard)/categories/page.tsx     # заглушка
  widgets/app-shell/                      # SidebarProvider + AppSidebar (nav + профиль) + header с SidebarTrigger
  widgets/transactions-list/              # Card: строки, скелетоны, пустое/ошибка, пагинация «Назад / Стр. X из Y / Вперёд»
  features/transaction/create/            # schema.ts (zod), CreateTransactionForm, CreateTransactionDialog, useCreateTransaction
  entities/transaction/                   # types, api (fetchTransactions, createTransaction), useTransactions(page), transactionKeys, ui/TransactionRow
  entities/category/                      # types, api (fetchCategories), useCategories(), categoryKeys
  entities/session/                       # + useSession()
  shared/api/client.ts                    # + setAuthTokenGetter
  shared/lib/format.ts                    # formatMoney, formatDate
  shared/ui/                              # + sidebar (тянет sheet, tooltip, skeleton, hooks/use-mobile), dialog, select, avatar
```

Детали:
- **`useTransactions(page)`**: `queryKey: ['transactions', 'list', { page, limit: 10 }]`, `placeholderData: keepPreviousData`. Пока грузится новая страница, старая остаётся на экране.
- **`useCreateTransaction`**: `useMutation` → `createTransaction`, `onSuccess` → `invalidateQueries({ queryKey: ['transactions'] })`. Ошибки `ApiError` уходят в root error формы, как в `LoginForm`.
- **`TransactionRow`** (entities/transaction) не импортирует `entities/category` (запрет кросс-импорта). Он получает `category?: { name; color }` пропсом, джойн по `categoryId` делает виджет `transactions-list`.
- **Форма** (react-hook-form + zod, примитивы `Field*`, паттерн из `features/auth/login/ui/login-form.tsx`):
  - поля: сумма (`> 0`, до 2 знаков), тип (две кнопки-переключателя «Расход» / «Доход», по умолчанию расход), категория (`Select` из `useCategories`), дата (по умолчанию сегодня), описание (опционально, ≤ 255);
  - при пустом списке категорий — подсказка «Сначала создайте категорию», submit заблокирован;
  - после успеха диалог закрывается, форма сбрасывается, список переходит на 1-ю страницу. Для этого диалог встраивается в шапку виджета `transactions-list` (widgets → features разрешено) и принимает `onCreated`, а не собирается рядом в `page.tsx` — иначе странице пришлось бы держать состояние пагинации.
- **AppSidebar**:
  - пункты с `lucide-react` иконками (`LayoutDashboard`, `ArrowLeftRight`, `Tags`), активный пункт через `usePathname`;
  - в футере профиль: `Avatar` с инициалами, `name ?? email`, email.

## Чеклист задач
- [x] 1. Скопировать план в `.claude/plans/home-page.md`
- [x] 2. Backend: пагинация `GET /transactions` (`page`/`limit` в DTO, `PaginatedTransactionsEntity`, `$transaction([findMany, count])`, Swagger). Проверить `typecheck`/`build` backend, отдельный коммит `feat(transactions)!`
- [x] 3. Frontend: установить `@tanstack/react-query`, добавить shadcn `sidebar`, `dialog`, `select`, `avatar` (`npx shadcn add` из `apps/frontend`)
- [x] 4. `shared`: `setAuthTokenGetter` в `apiClient`, `shared/lib/format.ts` (`formatMoney`, `formatDate`)
- [x] 5. `app/providers.tsx` (QueryClient + `TooltipProvider` для sidebar + регистрация getter токена из `getSession`), подключить в `app/layout.tsx`. `useSession()` в `entities/session`
- [x] 6. `entities/category`: типы, `fetchCategories`, `useCategories`, публичный `index.ts`
- [x] 7. `entities/transaction`: типы (`Transaction`, `TransactionType`, `PaginatedTransactions`, `CreateTransactionPayload`), `fetchTransactions`, `createTransaction`, `useTransactions`, `TransactionRow`
- [x] 8. `widgets/app-shell`: sidebar с навигацией и профилем, header с `SidebarTrigger`, редирект на `/login` без сессии
- [x] 9. `widgets/transactions-list`: список с джойном категорий, скелетоны, пустое и ошибочное состояния, пагинация по 10
- [x] 10. `features/transaction/create`: zod-схема, форма, диалог, `useCreateTransaction` с инвалидацией списка; кнопка диалога — в `CardAction` виджета `transactions-list` (`onCreated` → страница 1)
- [x] 11. Роутинг: `app/(dashboard)/layout.tsx`, `page.tsx` (главная), заглушки `/transactions` и `/categories`; удалить старый `app/page.tsx` и CSS лендинга
- [x] 12. Проверка: `npm run typecheck`, `npm run lint`, `npm run build` из корня; ручная проверка в браузере (см. ниже); при необходимости обновить `CLAUDE.md` (TanStack Query, route group `(dashboard)`)

## Verification
1. `docker-compose up postgres -d`, `npm run dev` из корня.
2. Swagger `/api`:
   - `GET /transactions?page=2&limit=10` → `{ items, total, page, limit, totalPages }`;
   - `limit=101` → 400, `page=0` → 400.
3. Через Swagger создать 1–2 категории и 12+ транзакций, либо создать транзакции через диалог.
4. Браузер (`/login` → `/`):
   - меню, профиль с именем и email;
   - список по 10, переключение страниц, «Стр. X из Y»;
   - создание транзакции появляется первой в списке;
   - ошибки валидации в форме.
5. Без сессии (очистить `tracker:session` в localStorage) `/` редиректит на `/login`.
6. `/transactions` и `/categories` открываются внутри того же layout, активный пункт меню подсвечен.
