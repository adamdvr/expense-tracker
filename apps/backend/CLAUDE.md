# CLAUDE.md (backend)

Эта инструкция дополняет корневой [`CLAUDE.md`](../../CLAUDE.md) и применяется при работе внутри `apps/backend`. Общие для монорепозитория правила (git-flow, коммиты, docker, turborepo) — там.

## Архитектура

- **Фреймворк**: Nest.js 10 с TypeScript strict mode
- **База данных**: PostgreSQL через Prisma ORM
- **Документация API**: Swagger на `/api`
- **Порт**: 3001 (по умолчанию)

**Архитектурные детали:**
- `PrismaService` — глобальный модуль (`@Global()`) с управлением lifecycle (connect/disconnect)
- Все эндпоинты автоматически валидируются через `ValidationPipe` (whitelist + transform)
- CORS настроен на `FRONTEND_URL` env переменную, по умолчанию localhost:3000
- Swagger автоматически генерируется из декораторов `@Api*`

## Основные команды

Из `apps/backend`:
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

## Environment переменные (.env)

```
DATABASE_URL="postgresql://tracker:tracker@localhost:5432/tracker"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000  # для CORS
JWT_SECRET=change-me-in-production   # секрет для подписи JWT
JWT_EXPIRES_IN=3600s                 # срок жизни access token
```

## Добавление новых модулей NestJS

При создании новых модулей в backend:
1. Используйте Nest CLI: `nest generate module feature`
2. Инжектируйте `PrismaService` для доступа к БД (уже глобальный)
3. Добавляйте `@Api*` декораторы для Swagger документации
4. DTO классы должны иметь декораторы валидации из `class-validator`
