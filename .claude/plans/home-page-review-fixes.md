# Code review ветки `feat/frontend-home-page` → план исправлений

> После одобрения план копируется в `.claude/plans/home-page-review-fixes.md`. Выполняем по одному пункту, с подтверждением перед следующим.

## Context
Ревью 4 коммитов ветки относительно `master` (пагинация `GET /transactions`, главный экран, app-shell, создание транзакции, TanStack Query, авторизация в `apiClient`). Проверялись безопасность, качество кода, соответствие паттернам проекта и FSD. Сгенерированные shadcn-файлы (`shared/ui/sidebar|dialog|select|sheet|avatar|tooltip|skeleton`) смотрел бегло: это код вендора.

**Что сделано хорошо:** направление импортов FSD соблюдено (`shared/api` получает токен через `setAuthTokenGetter` и не импортирует `entities/session`), публичные API через `index.ts`, `TransactionRow` не зависит от `entities/category`. Фабрики ключей и инвалидация по корневому ключу сделаны по правилам CLAUDE.md. На бэкенде выборка идёт с фильтром по `userId`, `limit` ограничен `@Max(100)`, `count` и `findMany` выполняются в одном `$transaction`. Цвет категории в inline-style безопасен, потому что бэкенд валидирует его через `@IsHexColor`. Ошибки API выводятся как текст. Коммиты оформлены по Conventional Commits, есть `BREAKING CHANGE`.

---

## Находки (от серьёзных к мелким)

### 🔴 Безопасность и корректность

**1. Кэш TanStack Query не сбрасывается при смене сессии: данные одного пользователя видны другому.**
`app/providers.tsx`: `QueryClient` живёт в root layout, то есть переживает переход на `/login` и повторный вход. Ключи `['transactions','list',{page,limit}]` и `['categories','list']` не зависят от пользователя.
Сценарий: пользователь A работает в приложении. В другой вкладке сессию очищают (или истекает токен, см. п.2), вкладка по событию `storage` уходит на `/login`. Там входит пользователь B, `router.push('/')` открывает главную, и B видит транзакции и категории A из кэша: при `staleTime: 30_000` повторного запроса нет.
Исправление: в `app/providers.tsx` подписаться на смену сессии (`useSession()` → `session?.user.id`) и вызывать `queryClient.clear()`, когда `userId` меняется или сессия пропадает.

**2. Истёкший или невалидный токен никак не обрабатывается.**
`JWT_EXPIRES_IN=3600s`, а в `Session` нет `expiresAt`. Через час `useSession()` по-прежнему возвращает `authenticated`, все запросы получают 401. Пользователь видит «Не удалось загрузить транзакции», а «Повторить» снова даёт 401. Кнопки выхода нет, так что пользователь застревает. Вдобавок `retry: 1` впустую повторяет 4xx.
Исправление: по образцу `setAuthTokenGetter` добавить в `shared/api/client.ts` `setUnauthorizedHandler(handler)`, который вызывается при `response.status === 401` на запросах с токеном. В `app/providers.tsx` зарегистрировать `() => clearSession()`. Редирект на `/login` уже делает `AppShell`, а кэш очистит п.1. В `defaultOptions.queries.retry` не повторять `ApiError` со статусом 4xx.

**3. `page` без верхней границы: вместо 400 бэкенд отвечает 500.** *(проверено: Prisma падает при `skip` больше int64, напр. `page=1e17`; int32 не ограничение)*
`find-transactions-query.dto.ts`: у `page` есть только `@Min(1)`. При `?page=1000000000` получается `skip = (page-1)*limit` ≈ 1e10, это больше INT4. Prisma бросает validation error, и он уходит клиенту как 500.
Исправление: добавить `@Max(...)` на `page` (например, `1_000_000`), чтобы `skip` оставался в пределах int32 при `limit ≤ 100`.

### 🟠 Качество и UX-корректность

**4. Номер страницы может выйти за `totalPages`.**
`widgets/transactions-list`: если `total` уменьшился (удаление с другого устройства или из будущего раздела `/transactions`), при `page > totalPages` показывается «Транзакций пока нет — добавьте первую» и «Стр. 3 из 2».
Ещё один случай: ошибка загрузки при переключении страницы. `data` становится `undefined`, `totalPages = 0`, футер пагинации пропадает, и остаётся только «Повторить».
Исправление: если `data && page > Math.max(data.totalPages, 1)`, сбросить `page` до `max(totalPages, 1)`. Пустое состояние показывать только при `data.total === 0`. `totalPages` для футера держать из последних успешных данных.

**5. `isNavigationItemActive` срабатывает на ложные префиксы.**
`widgets/app-shell/config/navigation.ts`: из-за `pathname.startsWith(item.href)` путь `/transactions-archive` подсвечивает «Транзакции».
Исправление: `pathname === item.href || pathname.startsWith(`${item.href}/`)`.

**6. Жёстко заданные цвета мимо токенов темы.**
`entities/transaction/ui/transaction-row.tsx`: `text-emerald-400` и `text-white`. По CLAUDE.md цвета берутся из токенов `globals.css`. Кроме того, белая буква на светлом цвете категории, выбранном пользователем (например, `#FFFF00`), нечитаема.
Исправление: добавить токен `--income` (или `--success`) в `globals.css` и `@theme inline` и использовать класс `text-income`. Цвет буквы в аватарке подбирать по яркости фона через небольшую утилиту в `shared/lib`, например `getContrastText(hex)`.

### 🟡 Паттерны, FSD, мелочи

**7. Форма создания привязана к диалогу.** `create-transaction-form.tsx` импортирует `DialogClose` и `DialogFooter`, поэтому вне диалога (например, на будущей странице `/transactions`) форму не использовать. Кнопки футера лучше вынести в `create-transaction-dialog.tsx`: форма получает `id`, submit-кнопка — `form="…"`. Или передавать кнопку «Отмена» через проп `onCancel`.

**8. Непоследовательный маппинг в entity на бэкенде.** `TransactionsService.findAll` теперь сам создаёт `PaginatedTransactionsEntity`, а `create/findOne/update/remove` возвращают модели Prisma, и `new TransactionEntity` делает контроллер. `getSummary` тоже собирает entity в сервисе, так что прецедент есть. Лучше выбрать одно правило. Предложение: сервис возвращает `{ items, total, page, limit }`, контроллер оборачивает в `PaginatedTransactionsEntity`, как для одиночных транзакций.

**9. Константа размера страницы лежит в `api`-сегменте.** `TRANSACTIONS_PAGE_SIZE` объявлен в `entities/transaction/api/use-transactions.ts`. Лучше перенести в `entities/transaction/config/` (или `model/constants.ts`) и реэкспортировать из `index.ts`.

**10. `shared/hooks/use-mobile.ts` не прогнан через Prettier** (двойные кавычки). Сегмент `shared/hooks` не описан в CLAUDE.md, хотя в `components.json` на него указывает алиас `hooks`. Нужно прогнать `prettier --write` и дописать сегмент в раздел FSD в CLAUDE.md.

**11. Гигиена ветки.** Незакоммиченная правка `CLAUDE.md` (обёртка `<important if=…>`) к фиче не относится. По правилам GitHub Flow её место в отдельной ветке `docs/…`. Ветка ответвлена от `ee49690`, это совпадает с текущим `master`, так что rebase не нужен.

**Вне диффа, на заметку (не исправляем здесь):** `login-form`/`register-form` вызывают `apiClient` прямо из UI через `try/catch`, а новый код использует `useMutation`. Имеет смысл унифицировать отдельной задачей. Токен в `localStorage` доступен при XSS: это осознанное решение архитектуры, httpOnly cookie стоит рассмотреть позже.

---

## План исправлений (чеклист)

- [x] 1. `app/providers.tsx`: `queryClient.clear()` при смене `userId` или выходе
- [x] 2. `shared/api/client.ts`: `setUnauthorizedHandler` + регистрация `clearSession` в провайдерах; `retry` без 4xx
- [x] 3. `apps/backend/.../find-transactions-query.dto.ts`: `@Max` на `page` (+ Swagger `maximum`)
- [x] 4. `widgets/transactions-list`: ограничить `page` значением `totalPages`, пустое состояние только при `total === 0`
- [x] 5. `widgets/app-shell/config/navigation.ts`: точное сравнение префикса
- [x] 6. `globals.css` токен `--income`, `shared/lib` контраст текста, правка `transaction-row.tsx`
- [x] 7. Вынести футер с кнопками из формы в диалог
- [x] 8. Бэкенд: маппинг `PaginatedTransactionsEntity` в контроллере
- [x] 9. Перенести `TRANSACTIONS_PAGE_SIZE` в `config`
- [x] 10. Prettier для `use-mobile.ts`, упомянуть `shared/hooks` в CLAUDE.md
- [x] 11. Правку `CLAUDE.md` с `<important>` — в отдельную ветку `docs/`

Коммиты: п.1–2 — `fix(frontend): …` (можно одним `fix(auth)`); п.3 и п.8 — `fix(transactions)` / `refactor(transactions)`; остальное — `fix(frontend)` / `refactor(frontend)` по одной логической единице.

## Проверка
- `npm run typecheck && npm run lint && npm run build` из корня.
- п.1: войти как A, открыть главную; в DevTools удалить `tracker:session` → редирект на `/login`; войти как B → на главной только данные B (в Network есть новые запросы `/transactions`, `/categories`).
- п.2: вручную испортить `accessToken` в `localStorage` → первый запрос даёт 401 → сессия очищается → `/login`, без повторного запроса.
- п.3: `curl -H "Authorization: Bearer …" "localhost:3001/transactions?page=1000000000"` → до исправления 500, после — 400.
- п.4: создать 11 транзакций, перейти на стр. 2, удалить одну через Swagger `DELETE /transactions/:id`, вернуться на вкладку и сделать refetch → страница переключается на 1.
- п.5–7: визуально через `npm run dev` (подсветка меню, цвет дохода, контраст буквы на светлой категории, диалог создания работает как раньше).
