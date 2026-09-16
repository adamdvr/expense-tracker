# CLAUDE.md (frontend)

Эта инструкция дополняет корневой [`CLAUDE.md`](../../CLAUDE.md) и применяется при работе внутри `apps/frontend`. Общие для монорепозитория правила (git-flow, коммиты, docker, turborepo) — там.

## Архитектура

- **Фреймворк**: Next.js 15 с App Router
- **Архитектура**: Feature-Sliced Design (FSD) — см. раздел «Feature-Sliced Design» ниже
- **UI-кит**: shadcn/ui (примитивы Base UI, пресет Nova) поверх Tailwind CSS v4
- **Стилизация**: CSS-переменные темы shadcn, смэппленные на палитру проекта в `globals.css`. Тема одна — тёмная, без переключателя (класс `dark` статически задан в `app/layout.tsx`)
- **Порт**: 3000 (по умолчанию)

**Архитектурные детали:**
- `src/app/` — роутинг Next.js (`page.tsx`/`layout.tsx`); одновременно выполняет роль FSD-слоя `app` (глобальные провайдеры, стили). Остальные FSD-слои — `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/`
- shadcn-компоненты ставятся в `src/shared/ui` (алиасы настроены в `components.json`, не дефолтный `src/components/ui`)
- API URL конфигурируется через `NEXT_PUBLIC_API_URL` env переменную

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
