# План: категории трат (backend)

## Context
Авторизация уже есть (JWT, `JwtAuthGuard`, `@CurrentUser()`), но ни один контроллер её пока не использует. Нужно добавить сущность `Category` (id, name, color, icon, userId) и CRUD API, доступный только владельцу категории. Модуль категорий станет первым защищённым контроллером в проекте.

## 1. Prisma-схема — `apps/backend/prisma/schema.prisma`
Добавить модель (закомментированный набросок `Category` заменить рабочей версией, наброски `Expense`/`Budget` оставить):
```prisma
model Category {
  id        String   @id @default(cuid())
  name      String
  color     String
  icon      String
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@map("categories")
}
```
В `User` добавить `categories Category[]`.
Связь `expenses Expense[]` пока не добавляем: модели `Expense` ещё нет.
Миграция: `cd apps/backend && npx prisma migrate dev --name add_categories`.

## 2. Модуль `apps/backend/src/categories/`
Слои как в `user`: Controller → Service → Repository → PrismaService.

- **`dto/create-category.dto.ts`**: `class-validator` + `@ApiProperty`, как в `auth/dto/register.dto.ts`
  - `name`: `@IsString() @IsNotEmpty() @MaxLength(50)`
  - `color`: `@IsHexColor()`, пример `#FF5733`
  - `icon`: `@IsString() @IsNotEmpty() @MaxLength(50)`, пример `shopping-cart`
- **`dto/update-category.dto.ts`**: `export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}` (`PartialType` из `@nestjs/swagger`, чтобы сохранить валидацию и Swagger-метаданные).
- **`entities/category.entity.ts`**: класс с `@ApiProperty` и конструктором из Prisma `Category`, по образцу `user/entities/user.entity.ts`.
- **`categories.repository.ts`**: использует `PrismaService`
  - `create(userId, dto)`
  - `findAllByUser(userId)`, сортировка `createdAt: 'asc'`
  - `findByIdAndUser(id, userId)`: `findFirst({ where: { id, userId } })`
  - `update(id, dto)`, `delete(id)`
- **`categories.service.ts`**
  - `create(userId, dto)`
  - `findAll(userId)`
  - `update(id, userId, dto)`: сначала `findOwnedOrThrow`, затем обновление
  - `remove(id, userId)`: сначала `findOwnedOrThrow`, затем удаление
  - приватный `findOwnedOrThrow`: если категории нет или она чужая, бросает `NotFoundException('Категория не найдена')`. Отдаём 404, а не 403, чтобы не раскрывать, что чужая категория существует.
- **`categories.controller.ts`**
  - на уровне класса: `@ApiTags('categories')`, `@ApiBearerAuth()`, `@UseGuards(JwtAuthGuard)`, `@Controller('categories')`
  - `POST /categories` → 201, `CategoryEntity`
  - `GET /categories` → 200, `CategoryEntity[]`
  - `PATCH /categories/:id` → 200, `CategoryEntity`, 404
  - `DELETE /categories/:id` → `@HttpCode(204)`, 404
  - владелец берётся через `@CurrentUser() user: User`, у каждого роута есть `@ApiOperation` и `@ApiResponse` (401, 404) на русском
- **`categories.module.ts`**: `controllers: [CategoriesController]`, `providers: [CategoriesRepository, CategoriesService]`. `PrismaModule` глобальный, поэтому импортировать его не нужно. Guard работает через `JwtStrategy`, которая уже зарегистрирована в `AuthModule`.

## 3. Регистрация — `apps/backend/src/app.module.ts`
Добавить `CategoriesModule` в `imports`.

## Переиспользуем
- `JwtAuthGuard`: `src/auth/guards/jwt-auth.guard.ts`
- `CurrentUser`: `src/auth/decorators/current-user.decorator.ts`
- `PrismaService`: `src/prisma/prisma.service.ts`
- глобальный `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) и `.addBearerAuth()` в Swagger (`src/main.ts`)

## Чеклист реализации
- [x] 0. Сохранить этот план в `.claude/plans/categories.md` (рядом с `auth-module.md`) и отмечать пункты там по мере выполнения
- [x] 1. Схема: модель `Category` + связь `User.categories` в `schema.prisma`
- [x] 2. Миграция `add_categories` применена, Prisma Client сгенерирован
- [x] 3. `dto/create-category.dto.ts` (name, color `@IsHexColor`, icon)
- [x] 4. `dto/update-category.dto.ts` (`PartialType` из `@nestjs/swagger`)
- [x] 5. `entities/category.entity.ts`
- [x] 6. `categories.repository.ts` (create, findAllByUser, findByIdAndUser, update, delete)
- [x] 7. `categories.service.ts` (create, findAll, update, remove + `findOwnedOrThrow` → 404)
- [x] 8. `categories.controller.ts` (`JwtAuthGuard`, `@ApiBearerAuth`, `@CurrentUser`, POST/GET/PATCH/DELETE)
- [x] 9. `categories.module.ts`
- [x] 10. Регистрация `CategoriesModule` в `app.module.ts`
- [x] 11. `npm run typecheck` и `npm run lint` проходят
- [x] 12. Ручная проверка сценариев из раздела «Проверка»

## Проверка
1. `docker-compose up postgres -d`, затем `cd apps/backend && npx prisma migrate dev --name add_categories`.
2. `npm run typecheck` и `npm run lint` из корня.
3. `npm run dev` в `apps/backend`, дальше через Swagger `/api` или curl:
   - запрос без токена к `GET /categories` → 401
   - `POST /auth/register` → получить `access_token`
   - `POST /categories` с `{name, color:"#FF5733", icon}` → 201
   - `POST` с `color:"red"` или лишним полем → 400
   - `GET /categories` → в списке только свои категории
   - `PATCH /categories/:id` с `{name}` → 200
   - второй пользователь делает `PATCH` или `DELETE` чужой категории → 404
   - `DELETE /categories/:id` → 204, повторный запрос → 404
