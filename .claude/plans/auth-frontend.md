# План: Frontend для логина и регистрации (FSD + shadcn/ui)

## Context
Backend auth уже реализован и не меняется:
- `POST /auth/register` `{ email, password, name? }` → 201 `{ access_token, user }`, 409 если email занят
- `POST /auth/login` `{ email, password }` → 200 `{ access_token, user }`, 401 при неверных данных
- `user`: `{ id, email, name: string | null, createdAt, updatedAt }`
- Ошибки валидации (`class-validator`, whitelist) → 400 с массивом `message`

Frontend сейчас — Next.js 15 App Router без UI-библиотек, чистый CSS (`globals.css` с CSS-переменными, тёмная тема). Нужно:
1. Завести Tailwind CSS + shadcn/ui (новый стек стилизации взамен «только CSS-переменные»).
2. Перестроить `apps/frontend/src` по Feature-Sliced Design.
3. Реализовать страницы `/login` и `/register`.
4. Отразить новую архитектуру и стек в корневом `CLAUDE.md`.

## Архитектурные решения

**FSD-слои в Next.js App Router** (адаптация, без отдельного слоя `pages` — его роль выполняет `app`):
```
src/
  app/          # Next.js routing (page.tsx, layout.tsx) + глобальные провайдеры/стили — совмещает роль FSD-слоя "app"
  widgets/      # композитные блоки UI (напр. auth-layout — карточка с брендингом, общая для login/register)
  features/     # пользовательские сценарии с логикой (auth/login, auth/register)
  entities/     # бизнес-сущности (user, session)
  shared/       # переиспользуемое: ui-кит (shadcn), api-клиент, config, lib
```
Правила:
- Импорты только "сверху вниз" (`app` → `widgets` → `features` → `entities` → `shared`), не наоборот.
- У каждого слайса — публичный API через `index.ts`, импорт извне слайса — только из него.
- shadcn-компоненты ставятся в `shared/ui` (переопределим alias в `components.json`, дефолт — `components/ui`).

**Стилизация**: Tailwind CSS + shadcn/ui (style: New York, base color: neutral, CSS-переменные для тем). Текущая тёмная палитра (`--surface-*`, `--accent`, `--text-*`) мэппится на переменные темы shadcn (`--background`, `--foreground`, `--primary` и т.д.), чтобы сохранить визуальный стиль. Тёмная тема остаётся единственной (как сейчас).

**Форма/валидация**: `react-hook-form` + `zod`. В актуальной версии shadcn CLI (4.21, база — Base UI вместо Radix) нет готового `Form`-компонента с контекстом — вместо него примитивы `Field`/`FieldGroup`/`FieldLabel`/`FieldError` (`shared/ui/field.tsx`), которые собираются вручную вокруг `useForm()`/`register()`; `FieldError` принимает `errors` в формате RHF (`{ message }[]`).

**Сессия**: `access_token` хранится в `localStorage` через `entities/session`. Health-check/protected routes/logout — вне скоупа этой задачи (только login/register), но `entities/session` закладывается так, чтобы эти фичи достраивались без переделок.

## Чеклист задач

- [x] 1. Установить и настроить Tailwind CSS + shadcn/ui в `apps/frontend` (init, `components.json` с алиасами под FSD)
- [x] 2. Смэппить текущую тёмную палитру на CSS-переменные темы shadcn в `globals.css`, обновить Tailwind config
- [x] 3. Добавить базовые shadcn-компоненты для форм (`button`, `input`, `label`, `field`, `separator`, `card`) в `shared/ui`
- [x] 4. Создать `shared/api` — базовый HTTP-клиент (`NEXT_PUBLIC_API_URL`, обработка ошибок бэкенда)
- [x] 5. Создать `entities/user` (тип `User`) и `entities/session` (хранение токена, `getSession`/`setSession`/`clearSession`)
- [x] 6. Создать `features/auth/login` — `LoginForm` (zod-схема, react-hook-form, вызов `POST /auth/login`, обработка 401, редирект на `/`)
- [x] 7. Создать `features/auth/register` — `RegisterForm` (вызов `POST /auth/register`, обработка 409, авто-логин из ответа, редирект на `/`)
- [x] 8. Создать `widgets/auth-layout` и страницы `app/login/page.tsx`, `app/register/page.tsx`
- [x] 9. Обновить корневой `CLAUDE.md`: FSD-архитектура фронтенда, публичный API слайсов, новый стек стилизации (Tailwind + shadcn/ui)
- [x] 10. Проверка: `npm run typecheck` и `npm run lint` в `apps/frontend`; ручная проверка register/login через запущенный backend (если БД доступна)

Выполняем по одному пункту за раз, с подтверждением перед следующим.
