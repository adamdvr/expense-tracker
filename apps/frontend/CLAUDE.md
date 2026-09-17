# CLAUDE.md (frontend)

Эта инструкция дополняет корневой [`CLAUDE.md`](../../CLAUDE.md) и применяется при работе внутри `apps/frontend`. Общие для монорепозитория правила (git-flow, коммиты, docker, turborepo) — там.

## Архитектура

- **Фреймворк**: Next.js 15 с App Router
- **Архитектура**: Feature-Sliced Design (FSD) — см. раздел «Feature-Sliced Design» ниже
- **UI-кит**: shadcn/ui (примитивы Base UI, пресет Nova) поверх Tailwind CSS v4
- **Загрузка данных**: TanStack Query (`@tanstack/react-query`); формы — react-hook-form + zod
- **Стилизация**: CSS-переменные темы shadcn, смэппленные на палитру проекта в `globals.css`. Тема одна — тёмная, без переключателя (класс `dark` статически задан в `app/layout.tsx`)
- **Порт**: 3000 (по умолчанию)

**Архитектурные детали:**
- `src/app/` — роутинг Next.js (`page.tsx`/`layout.tsx`); одновременно выполняет роль FSD-слоя `app` (глобальные провайдеры, стили). Остальные FSD-слои — `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/`
- shadcn-компоненты ставятся в `src/shared/ui`, их хуки (напр. `use-mobile`) — в `src/shared/hooks` (алиасы настроены в `components.json`, не дефолтный `src/components/ui`)
- API URL конфигурируется через `NEXT_PUBLIC_API_URL` env переменную
- `app/providers.tsx` — `QueryClientProvider`, `TooltipProvider` и регистрация источника токена: `setAuthTokenGetter(() => getSession()?.accessToken)`. `shared/api` не импортирует `entities/session` (это нарушило бы порядок FSD-слоёв), поэтому `apiClient` получает токен через этот getter и сам подставляет `Authorization: Bearer`. Там же `setUnauthorizedHandler(() => clearSession())` — 401 на запросе с токеном сбрасывает сессию (`AppShell` уводит на `/login`), и сброс кэша TanStack Query при смене пользователя: ключи кэша не содержат id пользователя. Запросы с ошибкой 4xx не повторяются
- `shared/api/client.ts`: `/auth/*` (логин, регистрация) никогда не получает текущий токен и не может вызвать `onUnauthorized()` — иначе неверный пароль на `/login` у уже залогиненного пользователя сбросил бы его рабочую сессию. Каждый запрос по умолчанию обрывается через 15с (`AbortSignal.timeout`), чтобы зависший запрос не держал UI в состоянии загрузки бесконечно
- Авторизованные страницы живут в route group `app/(dashboard)/` — её `layout.tsx` оборачивает их в `widgets/app-shell` (боковое меню, профиль, шапка); `AppShell` намеренно не рендерит `children`, пока `useSession()` не вернёт `authenticated` (иначе запросы к API уйдут без токена/до гидратации сессии из localStorage). Новые разделы приложения добавляются туда же, пункт меню — в `widgets/app-shell/config/navigation.ts`
- Сессия хранится в `localStorage` (`entities/session`) и синхронизируется через `useSyncExternalStore` + кастомное событие `tracker:session-change` (нативный `storage`-event не срабатывает в той же вкладке); в компонентах читается хуком `useSession()` → `{ status: 'loading' | 'authenticated' | 'unauthenticated', session }`
- Даты транзакций бэкенд хранит как полночь UTC — `shared/lib/format.ts` форматирует и парсит их именно в UTC (`timeZone: 'UTC'`), иначе в западных часовых поясах дата визуально съезжает на день назад

## Основные команды

Из `apps/frontend`:
```bash
# Разработка с hot reload
npm run dev

# Production сборка
npm run build

# Запуск production версии
npm run start
```

## Environment переменные (.env)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Feature-Sliced Design

Frontend использует адаптацию [Feature-Sliced Design](https://feature-sliced.design/) под Next.js App Router:

```
src/
  app/          # Next.js routing (page.tsx, layout.tsx) + глобальные провайдеры/стили.
                # Совмещает роль FSD-слоя "app". Отдельного слоя "pages" нет —
                # эту роль выполняют тонкие page.tsx, которые просто собирают
                # widgets/features, без бизнес-логики внутри.
  widgets/      # Композитные блоки UI (напр. auth-layout — обёртка для страниц логина/регистрации, app-shell — сайдбар авторизованных страниц)
  features/     # Пользовательские сценарии с логикой (напр. auth/login, auth/register, transaction/create)
  entities/     # Бизнес-сущности (напр. user, session, category, transaction)
  shared/       # Переиспользуемое: ui-кит (shadcn), api-клиент, config, lib, hooks
```

Правила:
- **Импорты только «сверху вниз»**: `app` → `widgets` → `features` → `entities` → `shared`. Слой не импортирует из слоя выше себя. Кросс-импорт между слайсами одного уровня (напр. `features/auth/login` → `features/auth/register`) не допускается — общая логика уходит на слой ниже (в примере с auth — в `entities/session`).
- **Публичный API через `index.ts`**: импортировать можно только из корня слайса (`@/entities/session`), а не из его внутренних файлов (`@/entities/session/model/storage`).
- **Запросы к API**: функции запросов, фабрика ключей кэша (`transactionKeys`, `categoryKeys`) и query-хуки (`useTransactions`, `useCategories`) лежат в `entities/<сущность>/api`; мутации пользовательских сценариев (`useCreateTransaction`) — в `features/<домен>/<сценарий>/api` и после успеха инвалидируют кэш по корневому ключу сущности.

### UI-кит (shadcn/ui)

- Компоненты ставятся командой `npx shadcn add <component>` из `apps/frontend` — алиасы в `components.json` настроены так, что файлы попадают сразу в `src/shared/ui` (а не в дефолтный `src/components/ui`).
- Текущая версия shadcn CLI (4.x) использует **Base UI** (`@base-ui/react`) как примитивы вместо Radix UI, и отдельный пакет `cn` вместо локальной склейки `clsx`+`tailwind-merge`. Пресет — Nova (`base-nova`), базовый цвет — `neutral`.
- Готового `Form`-компонента (react-hook-form через контекст) в реестре больше нет — вместо него примитивы `Field`/`FieldGroup`/`FieldLabel`/`FieldError` (`shared/ui/field.tsx`), которые собираются вручную вокруг `useForm()`. `FieldError` принимает `errors` в формате react-hook-form (`{ message }[]`).
- Тема только тёмная (без переключателя): цветовые токены shadcn (`--background`, `--primary`, `--border` и т.д.) заданы в блоке `.dark` в `globals.css`, смэпплены на палитру проекта (`--surface-*`, `--brand`, `--text-*`); класс `dark` статически зафиксирован на `<html>` в `app/layout.tsx`.

### Паттерны из виджета транзакций

- **Пагинация** (`widgets/transactions-list`): используется `keepPreviousData`, а число страниц (`totalPages`) хранится в локальном state, а не берётся из ответа напрямую — иначе при ошибке загрузки следующей страницы пропадает навигация. Текущая страница автокорректируется, если она перестала существовать после удаления транзакций.
- **Форма отделена от диалога**: `CreateTransactionForm` не завязана на `Dialog` — принимает `renderFooter` пропом, что позволяет переиспользовать форму вне модалки (напр. на отдельной странице).

## Добавление новых страниц Next.js

В App Router:
1. Создайте `page.tsx` в соответствующей директории `src/app/` — держите его тонким: только сборка из `widgets`/`features`, без бизнес-логики и запросов к API внутри самого `page.tsx`.
2. Бизнес-логику (запросы к API, формы, валидация, состояние) выносите в `features/<домен>/<сценарий>` или `entities/<сущность>`.
3. Для API роутов: создайте `route.ts` вместо `page.tsx`
4. UI собирайте из `shared/ui` (shadcn) и Tailwind-утилит; для новых shadcn-компонентов — `npx shadcn add <component>`
