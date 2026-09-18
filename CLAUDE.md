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

**Именование веток**: `<type>/<scope>-<краткое-описание>` (например `feat/frontend-home-page`) — подробнее в skill [`commit`](.claude/skills/commit/SKILL.md)

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

## Git: коммиты

Коммиты делаются через skill [`commit`](.claude/skills/commit/SKILL.md) (`/commit`): там соглашение Conventional Commits, именование веток, обязательные проверки перед коммитом и что нельзя коммитить.

## Обновление docs
При добавлении функционала, проверяй документацию в @.claude/docs/* и актуализируй
