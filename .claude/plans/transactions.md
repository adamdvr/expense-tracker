# План: транзакции (backend)

## Context
Сейчас в приложении есть пользователи, JWT-авторизация и категории, но нет самих доходов и расходов. Нужен `TransactionsModule`, центральный модуль учёта. Он включает модель `Transaction` в Prisma, CRUD с фильтрами и месячную сводку `summary` (итоги плюс разбивка по категориям). Структуру берём из `apps/backend/src/categories`: Controller → Service → Repository → PrismaService.

Что решили с пользователем:
- `summary` возвращает `totalIncome`, `totalExpense`, `balance` и `byCategory[]`.
- Категорию, в которой есть транзакции, удалить нельзя: API отвечает 409.

## 1. Prisma-схема: `apps/backend/prisma/schema.prisma`
```prisma
enum TransactionType {
  INCOME
  EXPENSE
}

model Transaction {
  id          String          @id @default(uuid())
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  description String?
  date        DateTime
  categoryId  String          @map("category_id")
  category    Category        @relation(fields: [categoryId], references: [id], onDelete: NoAction)
  userId      String          @map("user_id")
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime        @default(now())

  @@index([userId, date])
  @@index([categoryId])
  @@map("transactions")
}
```
- Добавить `transactions Transaction[]` в `User` и в `Category`.
- Для `onDelete` берём `NoAction`, а не `Restrict`. При прямом удалении категории поведение то же, что у RESTRICT. Разница в том, что `NO ACTION` проверяется в конце выражения, поэтому каскадное удаление User → (categories + transactions) не упадёт из-за порядка удаления.
- Закомментированный набросок `Expense` удалить, его заменяет `Transaction`. Набросок `Budget` оставить.
- Миграция: `cd apps/backend && npx prisma migrate dev --name add-transactions`.

## 2. Модуль `apps/backend/src/transactions/`

**DTO** (`class-validator` + `@ApiProperty`, как в `categories/dto/create-category.dto.ts`)
- `dto/create-transaction.dto.ts`
  - `amount: number`: `@IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() @Max(9999999999.99)`
  - `type`: `@IsEnum(TransactionType)`, enum из `@prisma/client`, в Swagger `@ApiProperty({ enum: TransactionType })`
  - `description?`: `@IsOptional() @IsString() @MaxLength(255)`
  - `date: Date`: `@Type(() => Date) @IsDate()` (`class-transformer` уже есть в зависимостях)
  - `categoryId`: `@IsString() @IsNotEmpty()`. У категорий cuid, поэтому `@IsUUID` здесь не подходит.
- `dto/update-transaction.dto.ts`: `PartialType(CreateTransactionDto)` из `@nestjs/swagger`
- `dto/find-transactions-query.dto.ts`: все поля опциональные, с `@ApiPropertyOptional`
  - `dateFrom`, `dateTo`: `@Type(() => Date) @IsDate()`
  - `type`: `@IsEnum(TransactionType)`
  - `categoryId`: `@IsString()`
- `dto/summary-query.dto.ts`: оба поля обязательные
  - `month`: `@Type(() => Number) @IsInt() @Min(1) @Max(12)`
  - `year`: `@Type(() => Number) @IsInt() @Min(2000) @Max(2100)`

Декораторы нужны на всех query-полях: глобальный `ValidationPipe` работает с `forbidNonWhitelisted`.

**Entities** (по образцу `categories/entities/category.entity.ts`)
- `entities/transaction.entity.ts`: id, `amount: string` (через `transaction.amount.toFixed(2)`, чтобы не терять точность Decimal), type, `description: string | null`, date, categoryId, userId, createdAt
- `entities/transaction-summary.entity.ts`: `CategorySummaryEntity` (categoryId, name, color, icon, type, total: string) и `TransactionSummaryEntity` (month, year, totalIncome, totalExpense, balance: string, `byCategory: CategorySummaryEntity[]`)

**`transactions.repository.ts`** (через `PrismaService`)
- `create(userId, dto)`: `{ ...dto, userId }`
- `findAllByUser(userId, filters)`: в `where` идут `userId`, `type`, `categoryId`, а `date: { gte: dateFrom, lte: dateTo }` добавляется только для заданных значений. Сортировка `[{ date: 'desc' }, { createdAt: 'desc' }]`.
- `findByIdAndUser(id, userId)`: `findFirst`
- `update(id, dto)`, `delete(id)`
- `findCategoryByIdAndUser(categoryId, userId)`: проверяет, что категория принадлежит пользователю
- `sumByCategory(userId, from, to)`: `groupBy({ by: ['categoryId', 'type'], where: { userId, date: { gte: from, lt: to } }, _sum: { amount: true } })`
- `findCategoriesByIds(ids)`: `category.findMany({ where: { id: { in: ids } } })`

**`transactions.service.ts`**
- `create(userId, dto)`: сначала `ensureCategoryOwned`, потом создание
- `findAll(userId, query)`
- `findOne(id, userId)`: `findOwnedOrThrow`
- `update(id, userId, dto)`: сначала `findOwnedOrThrow`; если передан `dto.categoryId`, дополнительно `ensureCategoryOwned`
- `remove(id, userId)`: сначала `findOwnedOrThrow`, потом удаление
- `getSummary(userId, { month, year })`
  - диапазон в UTC: `from = new Date(Date.UTC(year, month - 1, 1))`, `to = new Date(Date.UTC(year, month, 1))`, верхняя граница не включается
  - `sumByCategory`, затем `findCategoriesByIds`, склейка по `categoryId`
  - итоги считаются через `Prisma.Decimal` (`.plus` / `.minus`), в ответ идут через `toFixed(2)`
  - `byCategory` сортируется по `total` по убыванию; если транзакций нет, суммы `"0.00"` и пустой массив
- приватные методы:
  - `findOwnedOrThrow`: `NotFoundException('Транзакция не найдена')`
  - `ensureCategoryOwned`: `NotFoundException('Категория не найдена')`
  - 404 вместо 403 по той же причине, что в categories

**`transactions.controller.ts`**
- на уровне класса: `@ApiTags('transactions')`, `@ApiBearerAuth()`, `@UseGuards(JwtAuthGuard)`, `@Controller('transactions')`
- `POST /transactions` → 201, `TransactionEntity`, 404 если категория не найдена
- `GET /transactions` → `@Query() query: FindTransactionsQueryDto`, `TransactionEntity[]`
- `GET /transactions/summary` → `@Query() query: SummaryQueryDto`, `TransactionSummaryEntity`. **Этот метод объявить до `GET :id`**, иначе `summary` будет пойман как `:id`.
- `GET /transactions/:id` → 200 или 404
- `PATCH /transactions/:id` → 200 или 404
- `DELETE /transactions/:id` → `@HttpCode(204)`, 404
- у каждого роута есть `@CurrentUser() user: User`, `@ApiOperation` и `@ApiResponse` (400, 401, 404) на русском

**`transactions.module.ts`**: `controllers: [TransactionsController]`, `providers: [TransactionsRepository, TransactionsService]`

## 3. Регистрация: `apps/backend/src/app.module.ts`
Добавить `TransactionsModule` в `imports`.

## 4. Запрет удаления категории с транзакциями: `apps/backend/src/categories/`
- `categories.repository.ts`: добавить `hasTransactions(id)` = `prisma.transaction.count({ where: { categoryId: id } }) > 0`
- `categories.service.ts`, `remove`: после `findOwnedOrThrow`, если в категории есть транзакции, бросить `ConflictException('Нельзя удалить категорию, в которой есть транзакции')`
- `categories.controller.ts`: добавить `@ApiResponse({ status: 409, ... })` к `DELETE`

## Переиспользуем
- `JwtAuthGuard` (`src/auth/guards/jwt-auth.guard.ts`) и `CurrentUser` (`src/auth/decorators/current-user.decorator.ts`)
- глобальный `PrismaService` (`src/prisma/prisma.service.ts`)
- глобальный `ValidationPipe` с `transform: true` и `.addBearerAuth()` (`src/main.ts`)
- паттерн `findOwnedOrThrow` и формат entity из `src/categories/`
- новых зависимостей нет: `class-validator`, `class-transformer` и `@nestjs/swagger` уже установлены

## Чеклист реализации
Выполнять по одному пункту, после каждого ждать подтверждения.
- [x] 0. Сохранить план в `.claude/plans/transactions.md` и отмечать пункты там по мере выполнения
- [x] 1. Схема: enum `TransactionType`, модель `Transaction`, связи в `User` и `Category`, удалить набросок `Expense`
- [x] 2. Применить миграцию `add-transactions` и сгенерировать Prisma Client
- [x] 3. DTO: `create-transaction`, `update-transaction`
- [x] 4. DTO: `find-transactions-query`, `summary-query`
- [x] 5. Entities: `transaction.entity.ts`, `transaction-summary.entity.ts`
- [x] 6. `transactions.repository.ts`
- [x] 7. `transactions.service.ts` (CRUD + `getSummary`)
- [x] 8. `transactions.controller.ts` (6 эндпоинтов, `summary` объявлен до `:id`)
- [x] 9. `transactions.module.ts` и регистрация в `app.module.ts`
- [x] 10. Categories: 409 при удалении категории с транзакциями
- [x] 11. `npm run typecheck`, `npm run lint`, `npm run build` проходят
- [x] 12. Ручная проверка сценариев из раздела «Проверка»

## Проверка
1. `docker-compose up postgres -d`, затем `cd apps/backend && npx prisma migrate dev --name add-transactions`. Проверить, что в `migration.sql` есть enum, таблица `transactions`, индексы и FK.
2. Из корня: `npm run typecheck`, `npm run lint`, `npm run build`.
3. `npm run dev` в `apps/backend`, дальше через Swagger `/api` или curl с токеном после `POST /auth/register`:
   - `GET /transactions` без токена → 401
   - `POST /categories`, затем `POST /transactions` с `{amount: 1500.5, type: "EXPENSE", date: "2026-09-10T12:00:00Z", categoryId}` → 201, в ответе `amount: "1500.50"`
   - `POST` с `amount: -1`, `amount: 1.234`, `type: "FOO"`, лишним полем или без `date` → 400
   - `POST` с чужим или несуществующим `categoryId` → 404
   - `GET /transactions?type=EXPENSE&dateFrom=2026-09-01&dateTo=2026-09-30T23:59:59Z&categoryId=...` → фильтры применяются
   - `GET /transactions/summary?month=9&year=2026` → корректные итоги и `byCategory`; без `month` или с `month=13` → 400; месяц без транзакций → нули и `[]`
   - `GET`, `PATCH`, `DELETE /transactions/:id` → 200 / 200 / 204; для чужой транзакции второй пользователь получает 404
   - `DELETE /categories/:id` для категории с транзакциями → 409; после удаления транзакций → 204
