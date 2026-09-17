# Правила code review для expense-tracker

Дополняет `CLAUDE.md`. Здесь — только то, что напрямую влияет на качество ревью; общие принципы (типизация, DRY и т.п.) не повторяются.

## Backend: авторизация и владение данными

- `Transaction`/`Category` привязаны к `userId`; владение проверяется в **service** (`findOwnedOrThrow`/`findByIdAndUser`, см. `transactions.service.ts`, `categories.service.ts`) **до** вызова repository-методов `update(id, ...)`/`delete(id)` — они принимают только `id`, без `userId`, и сами по себе не защищены от IDOR. Любой новый repository-метод по голому `id` обязан вызываться только после проверки владения в service.
- Identity текущего пользователя (`userId`, по которому фильтруются/создаются ресурсы) берётся только из аутентифицированного контекста — `@CurrentUser()` — и никогда из значения, присланного клиентом. Каждый защищённый controller должен иметь `@UseGuards(JwtAuthGuard)`.
- Resource ID (`categoryId`, `:id` транзакции/категории и т.п.) клиент передавать может — это нормально (см. `CreateTransactionDto.categoryId`, `@Param('id')`). Но перед операцией над таким ресурсом сервис обязан проверить принадлежность текущему пользователю (`ensureCategoryOwned`, `findOwnedOrThrow`), как уже сделано в `transactions.service.ts`/`categories.service.ts`.
- Ответ никогда не должен отдавать сырой Prisma-объект (`User` с `passwordHash` и т.п.) — только через `*Entity`-классы с явным белым списком полей (`UserEntity`, `TransactionEntity`, `CategoryEntity`).

## Backend: данные и корректность

- `amount` — `Prisma.Decimal(12,2)`; арифметика только через методы `Decimal` (`.plus`/`.minus`/`.toFixed(2)`), не через `number`/`parseFloat` — иначе потеря точности в суммах/балансе.
- Паттерн «check-then-write» на уникальных полях (пример: `findByEmail` → `create` в `UserService.createUser`) уязвим к гонкам — конкурентный запрос обходит проверку и падает необработанной Prisma-ошибкой (P2002) вместо ожидаемого 409. Проверять то же для любых новых uniqueness-проверок.
- Глобально включены `whitelist: true` + `forbidNonWhitelisted: true` + `transform: true` (`main.ts`): поле DTO без `class-validator`-декоратора не имеет validation metadata и считается неразрешённым — при `forbidNonWhitelisted: true` запрос с таким полем отклоняется 400, а не проходит и не отбрасывается тихо. Проверять, что новые DTO-поля имеют подходящие декораторы и что это поведение (400 на лишнее поле) соответствует тому, что реально произойдёт с текущим конфигом `ValidationPipe`.
- Сервисный слой бросает семантические Nest-исключения (`NotFoundException`, `ConflictException`), а не пропускает наружу сырые ошибки Prisma — иначе на фронте нечитаемый 500 вместо `ApiError`.

## Frontend: React/Next.js и FSD

- Направление импортов (`app → widgets → features → entities → shared`) и импорт только через `index.ts` слайса **не проверяются линтером** (`.eslintrc` — только `next/core-web-vitals`, без `eslint-plugin-boundaries`) — ревьюер обязан проверять это вручную.
- Сессия (`accessToken`) хранится в `localStorage` (`entities/session/model/storage.ts`), поэтому XSS в этом приложении особенно критичен — но обычный вывод строки через JSX (`{value}`) React экранирует сам и **не является** finding'ом (не флагать вывод `description`, `category.name` и подобных строк через `{}`). Искать нужно конкретные опасные sinks: `dangerouslySetInnerHTML`, прямые DOM-вставки (`innerHTML`, `insertAdjacentHTML`), вставку HTML из внешних/пользовательских источников, любой обход стандартного React escaping, а также `href`/`src` и подобные атрибуты, собранные из пользовательских данных, если они реально образуют injection/executable path (`javascript:`-схема и т.п.).
- `apiClient` (`shared/api/client.ts`) не проставляет `Authorization` автоматически — новые запросы к защищённым эндпоинтам должны сами передавать `Authorization: Bearer <accessToken>` и обрабатывать 401, а не падать молча.
- Существующие `page.tsx` (`login`, `register`) — только композиция `widgets`/`features`, без запросов к API и бизнес-логики внутри самого файла (см. `CLAUDE.md`, раздел «Добавление новых страниц Next.js»). Не флагать сам факт наличия кода или размер `page.tsx` — finding обоснован, только если diff переносит уже существующую domain/API-логику обратно в `page.tsx`, дублирует то, что уже есть в `features`/`entities`, или иначе нарушает направление зависимостей `app → widgets → features → entities → shared`.

## API contract: backend ↔ frontend

- Общего пакета типов/кодогенерации нет (`packages/` пуст) — типы (`entities/user`, `entities/session`) и zod-схемы (`features/auth/*/model/schema.ts`) вручную дублируют backend DTO/Entity. Изменение DTO/Entity (переименование поля, новое обязательное поле, правило валидации типа `MinLength`) требует проверки соответствующего типа/схемы на frontend, и наоборот.
- Формат ошибок backend — `{ statusCode, message, error }`, `message` строка или массив (разбирает `shared/api/api-error.ts`). Новые ручки не должны менять этот формат без синхронного обновления `ApiError`.

## Документационные изменения (CLAUDE.md, README, архитектурные комментарии)

Технические утверждения проверяются по реальному коду текущей ветки, а не принимаются на веру:

- файлы/модули/хуки/роуты считаются существующими только если реально найдены в текущей ветке, а не потому что упомянуты в документации;
- зависимости проверяются по `package.json`, а не по тексту (пример: TanStack Query в проекте пока не используется — в `apps/frontend/package.json` его нет);
- код из другой ветки/PR не является доказательством, что функциональность есть в текущей ветке;
- документация про ещё не смерженный код — отдельный finding.

## Lock-файлы, Prisma migrations, generated artifacts

- **Lock-файл** — в репозитории только `package-lock.json` (npm workspaces, `packageManager: npm@10.9.2`; `pnpm-lock.yaml`/`yarn.lock` нет). Не ревьюить его построчно как handwritten-код и не создавать findings по внутреннему формату, порядку записей, `integrity`/hash-полям и прочим автогенерируемым деталям. Проверять только семантику: соответствует ли изменение `package-lock.json` изменениям в `package.json`; не появились ли неожиданные новые зависимости; не пропали ли зависимости без изменения manifest; нет ли подозрительного массового обновления пакетов, не связанного с diff'ом.
- **Prisma migrations** (`apps/backend/prisma/migrations/**/migration.sql`, коммитятся вместе со `schema.prisma`, см. `CLAUDE.md`) — не оценивать сгенерированный SQL по стилю/форматированию, но обязательно проверять семантический эффект: `DROP TABLE`/`DROP COLUMN`; rename, реализованный как drop+create (потеря данных); `NOT NULL`-колонка без безопасного пути для существующих строк; новые `UNIQUE`; изменение foreign keys и referential behavior (`CASCADE`/`RESTRICT`/`NO ACTION` — в проекте уже есть `onDelete: Cascade` у `Category`/`Transaction` и `onDelete: NoAction` у связи `Transaction.category`); изменение типа колонки; расхождение миграции с текущим `schema.prisma` или с кодом текущей ветки. Finding по миграции — только с конкретным failure/data-loss сценарием, не по факту наличия миграции.
- **Generated/vendor artifacts** (в т.ч. любой сгенерированный код, случайно попавший в diff, — по `.gitignore` `dist/`, `.next/`, `build/`, `*.tsbuildinfo` не коммитятся, но правило действует, если такое всё же появится) — более низкий приоритет ревью: глубина анализа тратится на handwritten source. Сам факт generated-диффа не является finding; finding допустим только если изменение реально ломает поведение, сборку, зависимости, безопасность или данные.

## Против ложных срабатываний

Не сообщать: о проблемах из до-diff кода; о стилистике и форматировании, которое контролирует Prettier/ESLint; о потенциальной проблеме без конкретного failure scenario; о speculative issues без подтверждения в коде; о рефакторинге "ради чистоты" без реального риска.

Перед finding: 1) прочитать затронутый код целиком, не только diff; 2) при необходимости пройти цепочку service → repository → controller → frontend-клиент; 3) сформулировать конкретный failure scenario; 4) убедиться, что проблему ввёл именно этот diff; 5) указать точный файл и место; 6) не выдавать предположение за факт.
