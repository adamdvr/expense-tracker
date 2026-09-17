# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Архитектура проекта

Это npm workspaces монорепозиторий с Turborepo для управления сборками. Проект состоит из двух основных приложений:

- **Backend** (`apps/backend`) — детали архитектуры, команды, работа с БД, env — см. [`apps/backend/CLAUDE.md`](apps/backend/CLAUDE.md)
- **Frontend** (`apps/frontend`) — детали архитектуры, Feature-Sliced Design, команды, env — см. [`apps/frontend/CLAUDE.md`](apps/frontend/CLAUDE.md)

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

Команды для конкретного приложения (dev, build, миграции Prisma и т.п.) — см. `apps/backend/CLAUDE.md` и `apps/frontend/CLAUDE.md`.

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

Полный список переменных для каждого приложения — в `apps/backend/CLAUDE.md` (`DATABASE_URL`, `JWT_SECRET` и т.д.) и `apps/frontend/CLAUDE.md` (`NEXT_PUBLIC_API_URL`).

## Turborepo кэширование

Turborepo кэширует результаты задач. Важные детали:
- `dev` задачи не кэшируются (`cache: false`)
- `build` кэширует outputs: `.next/`, `dist/`
- Кэш хранится в `.turbo/` (в gitignore)
- Env файлы отслеживаются как `globalDependencies`

## Git: ветки (GitHub Flow)

Работа ведётся по [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow):

- `master` — единственная долгоживущая ветка, всегда в рабочем состоянии (typecheck, lint и build проходят). Напрямую в `master` не коммитим
- Любая работа (фича, фикс, рефакторинг, документация) — в отдельной короткоживущей ветке, созданной от актуального `master`
- Одна ветка — одна фича/задача. Ветка сливается в `master` через Pull Request и после слияния удаляется

**Именование веток**: `<type>/<scope>-<краткое-описание>` — латиницей, kebab-case, `type` из того же списка, что и в коммитах:

- `feat/frontend-home-page` — новая фича
- `fix/auth-token-refresh` — исправление бага
- `refactor/transactions-service`, `docs/readme-setup`, `chore/eslint-config`

**Workflow:**
```bash
git switch master && git pull          # актуализировать master
git switch -c feat/<scope>-<описание>  # создать ветку под задачу
# ... коммиты по Conventional Commits ...
git push -u origin feat/<scope>-<описание>
# открыть PR в master → ревью → merge → удалить ветку
```

Правила:
- Перед созданием PR ветка актуализируется относительно `master` (`git rebase master` или merge), конфликты решаются в ветке
- Заголовок PR оформляется так же, как коммит по Conventional Commits
- В PR не смешиваются несвязанные изменения — для посторонних правок заводится отдельная ветка

**Создание PR:**
- PR создаётся через `gh pr create` (не через веб-интерфейс)
- Перед написанием описания посмотреть `git diff master...HEAD` (и `git log master..HEAD --oneline`), чтобы описание точно отражало содержимое изменений, а не пересказывало задачу по памяти
- Тело PR — через `--body "$(cat <<'EOF' ... EOF)"`, структура:
  ```
  ## Summary
  <1-3 пункта: что изменено>

  ## Почему
  <контекст/мотивация, если не очевидна из Summary — необязательно>

  ## Test plan
  <чеклист markdown: как проверить, что изменения работают>
  ```

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
