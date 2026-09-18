# CLAUDE.md (backend)

Эта инструкция дополняет корневой [`CLAUDE.md`](../../CLAUDE.md) и применяется при работе внутри `apps/backend`. Общие для монорепозитория правила (git-flow, docker, turborepo) — там; правила коммитов — в skill [`commit`](../../.claude/skills/commit/SKILL.md).

## Архитектура

- **Фреймворк**: Nest.js 10 с TypeScript strict mode
- **База данных**: PostgreSQL через Prisma ORM
- **Документация API**: Swagger на `/api`
- **Порт**: 3001 (по умолчанию)

**Архитектурные детали:**
- `PrismaService` — глобальный модуль (`@Global()`) с управлением lifecycle (connect/disconnect)
- Все эндпоинты автоматически валидируются через `ValidationPipe` (`whitelist` + `forbidNonWhitelisted` + `transform`) — лишние поля в body не отбрасываются молча, а вызывают 400
- CORS настроен на `FRONTEND_URL` env переменную, по умолчанию localhost:3000
- Swagger автоматически генерируется из декораторов `@Api*`

**Слои модуля (Controller → Service → Repository):**
- Prisma не вызывается напрямую из сервисов — за это отвечает отдельный `*.repository.ts` (единственный слой, инжектирующий `PrismaService`)
- Каждый модуль отдаёт наружу не Prisma-модель, а `entities/*.entity.ts` с `@ApiProperty()`, собранную из неё в конструкторе — это скрывает лишние поля (напр. `passwordHash`) и даёт корректную Swagger-схему
- Ресурсы, принадлежащие пользователю (categories, transactions), в сервисе перед update/delete вызывают приватный `findOwnedOrThrow(id, userId)`, который бросает `NotFoundException` (не `ForbiddenException`) на чужую запись — намеренно, чтобы не палить факт существования чужих данных. Соблюдайте этот паттерн для новых user-scoped ресурсов
- Модульная изоляция не строгая: `TransactionsRepository` напрямую читает `prisma.category` (см. `findCategoryByIdAndUser`, `findCategoriesByIds`) вместо обращения через `CategoriesRepository`/`CategoriesService`
- Суммы — `Prisma.Decimal` (`.plus()`, `.minus()`, `.toFixed(2)`), не обычные JS-числа — см. `TransactionsService.getSummary()`. Не приводите к `number` при работе с деньгами
- Порядок роутов важен: в `TransactionsController` `GET /transactions/summary` объявлен раньше `GET /transactions/:id`, иначе Nest матчит `summary` как `:id` — учитывайте при добавлении новых статических путей рядом с `:id`

## Аутентификация

- JWT payload — `{ sub: userId, email }` (`auth.service.ts`); `JwtStrategy.validate()` по `sub` подгружает пользователя из БД и кладёт в `request.user`
- `@CurrentUser()` (`auth/decorators/current-user.decorator.ts`) возвращает **сырую Prisma-модель `User`, включая `passwordHash`** — если отдаёте её наружу из контроллера, оборачивайте в `UserEntity`
- Guard навешивается вручную на каждый защищённый контроллер (`@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()`), глобального `APP_GUARD` нет — новый контроллер по умолчанию публичный, если не добавить это явно
- Пароли — `bcrypt`, `SALT_ROUNDS = 10` захардкожен в `auth.service.ts` (не вынесен в env)

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
- `User → Category`/`Transaction` — `onDelete: Cascade`, но `Transaction.category` — `onDelete: NoAction`: удаление категории с транзакциями заблокировано на уровне сервиса (`CategoriesService.remove()` бросает `ConflictException`, если есть связанные транзакции), а не каскадом в БД

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

При создании новых модулей в backend (см. `categories`/`transactions` как образец):
1. Используйте Nest CLI: `nest generate module feature`
2. Заведите `feature.repository.ts` — единственный слой, инжектирующий `PrismaService`; сервис обращается к БД только через него
3. Заведите `entities/*.entity.ts` для ответов наружу — не отдавайте Prisma-модель напрямую
4. Для user-scoped ресурсов реализуйте `findOwnedOrThrow(id, userId)` в сервисе и вызывайте перед update/delete
5. Защищённый контроллер — вручную `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()` (глобального guard нет)
6. Добавляйте `@Api*` декораторы для Swagger документации
7. DTO классы должны иметь декораторы валидации из `class-validator`
