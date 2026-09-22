# База данных

> **Документация:** [Архитектура](architecture.md) · [API](api.md) · База данных · [Гайд разработчика](developer-guide.md)
>
> Источник истины — `apps/backend/prisma/schema.prisma` и SQL-миграции в `apps/backend/prisma/migrations/`. Документ сверен с ними; при расхождении прав код.

---

## 1. Общие сведения

| Параметр | Значение |
|---|---|
| СУБД | PostgreSQL 16 (локально — Docker-образ `postgres:16-alpine`, контейнер `tracker-db`) |
| ORM | Prisma 5 (`prisma-client-js`) |
| Схема | `apps/backend/prisma/schema.prisma` |
| Миграции | `apps/backend/prisma/migrations/`, хранятся в git, провайдер зафиксирован в `migration_lock.toml` |
| Локальное подключение | `postgresql://tracker:tracker@localhost:5432/tracker` (переменная `DATABASE_URL`) |
| Доступ из кода | Только через `PrismaService` и только в `*.repository.ts` |

Таблиц три — `users`, `categories`, `transactions` — плюс enum `TransactionType`.

---

## 2. ER-диаграмма

```mermaid
erDiagram
    users ||--o{ categories : "user_id, ON DELETE CASCADE"
    users ||--o{ transactions : "user_id, ON DELETE CASCADE"
    categories ||--o{ transactions : "category_id, ON DELETE NO ACTION"

    users {
        text id PK "cuid"
        text email UK
        text name "nullable"
        text password_hash "bcrypt"
        timestamp createdAt
        timestamp updatedAt
    }

    categories {
        text id PK "cuid"
        text name
        text color "HEX"
        text icon
        text user_id FK
        timestamp createdAt
        timestamp updatedAt
    }

    transactions {
        text id PK "uuid"
        decimal amount "12,2"
        TransactionType type "INCOME или EXPENSE"
        text description "nullable"
        timestamp date
        text category_id FK
        text user_id FK
        timestamp createdAt
    }
```

Предметная модель: **пользователь** владеет своими **категориями** и **транзакциями**; каждая транзакция относится ровно к одной категории **того же** пользователя.

---

## 3. Соглашения схемы

Эти детали важны при написании raw SQL, отладке в `psql` и новых миграциях.

- **Имена таблиц** — во множественном числе и в snake_case через `@@map` (`users`, `categories`, `transactions`).
- **Имена колонок смешанные.** Snake_case только у полей с явным `@map`: `password_hash`, `user_id`, `category_id`. Остальные колонки называются как поля Prisma, поэтому `createdAt` и `updatedAt` хранятся в camelCase, и в SQL их нужно брать в кавычки: `"createdAt"`.
- **Первичные ключи** — `TEXT`. Значения генерирует **Prisma Client**, а не БД: `cuid()` для `users` и `categories`, `uuid()` для `transactions`. У колонки `id` нет `DEFAULT`, поэтому при вставке через raw SQL `id` нужно передавать явно.
- **`updatedAt`** — `NOT NULL` без значения по умолчанию в БД. Его выставляет Prisma (`@updatedAt`) при каждом `create` и `update`; в raw SQL его нужно задавать самому.
- **Время** хранится в `TIMESTAMP(3)` — без часового пояса, с точностью до миллисекунд. Prisma пишет и читает значения в UTC.
- **Enum** `TransactionType` — нативный тип PostgreSQL `"TransactionType"` со значениями `INCOME` и `EXPENSE`.

---

## 4. Таблицы

### 4.1. `users` — пользователи

Учётные записи. Создаётся при `POST /auth/register`; эндпоинтов изменения и удаления нет.

| Колонка | Тип SQL | NULL | По умолчанию | Ограничения | Назначение |
|---|---|---|---|---|---|
| `id` | `TEXT` | нет | — (cuid из Prisma) | PK `users_pkey` | Идентификатор пользователя. Попадает в JWT как `sub` и во все `user_id` |
| `email` | `TEXT` | нет | — | UNIQUE `users_email_key` | Логин. Хранится в том виде, в котором введён: регистр значим, `User@x.com` ≠ `user@x.com` |
| `name` | `TEXT` | да | `NULL` | — | Необязательное отображаемое имя. Показывается в боковом меню; если имени нет, вместо него выводится email |
| `password_hash` | `TEXT` | нет | — | — | bcrypt-хэш пароля (10 раундов, соль внутри хэша). Наружу никогда не отдаётся: `UserEntity` его не содержит |
| `createdAt` | `TIMESTAMP(3)` | нет | `CURRENT_TIMESTAMP` | — | Дата регистрации |
| `updatedAt` | `TIMESTAMP(3)` | нет | — (Prisma) | — | Дата последнего изменения. Эндпоинтов изменения профиля нет, поэтому фактически совпадает с `createdAt` |

### 4.2. `categories` — категории

Пользовательские категории доходов и расходов («Продукты», «Зарплата»). Используются как справочник для транзакций и для группировки в сводке.

| Колонка | Тип SQL | NULL | По умолчанию | Ограничения | Назначение |
|---|---|---|---|---|---|
| `id` | `TEXT` | нет | — (cuid из Prisma) | PK `categories_pkey` | Идентификатор категории |
| `name` | `TEXT` | нет | — | — | Название. Длина 1–50 проверяется только в DTO; в БД ограничения длины нет. **Не уникально**, в том числе в рамках одного пользователя |
| `color` | `TEXT` | нет | — | — | HEX-цвет (`#RRGGBB`, допустимы `#RGB` и варианты с альфа-каналом — проверяет `@IsHexColor` в DTO). Frontend рисует им точку категории в списке транзакций и значок на странице категорий |
| `icon` | `TEXT` | нет | — | — | Имя lucide-иконки в kebab-case (например, `shopping-cart`), 1–50 символов по DTO. Frontend рисует иконку по своему реестру (`entities/category/config/icons.ts`), имя не из реестра — иконкой `tag` |
| `user_id` | `TEXT` | нет | — | FK `categories_user_id_fkey` → `users(id)` ON DELETE CASCADE ON UPDATE CASCADE; индекс `categories_user_id_idx` | Владелец категории |
| `createdAt` | `TIMESTAMP(3)` | нет | `CURRENT_TIMESTAMP` | — | Дата создания. По ней сортируется `GET /categories` (по возрастанию) |
| `updatedAt` | `TIMESTAMP(3)` | нет | — (Prisma) | — | Дата последнего изменения, обновляется при `PATCH /categories/:id` |

### 4.3. `transactions` — транзакции

Центральная таблица: каждая запись — одна операция дохода или расхода.

| Колонка | Тип SQL | NULL | По умолчанию | Ограничения | Назначение |
|---|---|---|---|---|---|
| `id` | `TEXT` | нет | — (uuid из Prisma) | PK `transactions_pkey` | Идентификатор транзакции (UUID v4) |
| `amount` | `DECIMAL(12,2)` | нет | — | — | Сумма операции, **всегда положительная**: знак задаёт `type`. Максимум `9 999 999 999.99`. Положительность и не больше 2 знаков после запятой проверяет DTO, `CHECK`-ограничения в БД нет. В API отдаётся строкой `"1500.50"` |
| `type` | `"TransactionType"` | нет | — | enum | `INCOME` — доход, `EXPENSE` — расход. По нему считаются `totalIncome` и `totalExpense` в сводке |
| `description` | `TEXT` | да | `NULL` | — | Необязательный комментарий. Длина до 255 проверяется только в DTO. Очищается через `PATCH` с `"description": null` |
| `date` | `TIMESTAMP(3)` | нет | — | входит в индекс `transactions_user_id_date_idx` | **Дата операции**, её задаёт пользователь (в отличие от `createdAt`). Frontend записывает полночь UTC выбранного дня. По этой колонке идут сортировка списка, фильтры `dateFrom`/`dateTo` и границы месяца в сводке |
| `category_id` | `TEXT` | нет | — | FK `transactions_category_id_fkey` → `categories(id)` ON DELETE NO ACTION ON UPDATE CASCADE; индекс `transactions_category_id_idx` | Категория операции. Категория должна принадлежать тому же пользователю — это проверяет сервис, а не БД |
| `user_id` | `TEXT` | нет | — | FK `transactions_user_id_fkey` → `users(id)` ON DELETE CASCADE ON UPDATE CASCADE; индекс `transactions_user_id_date_idx` | Владелец. Хранится в самой транзакции, хотя его можно вывести через категорию: так все выборки фильтруются по одной колонке и индексу без JOIN |
| `createdAt` | `TIMESTAMP(3)` | нет | `CURRENT_TIMESTAMP` | — | Момент создания записи. Второй ключ сортировки списка при одинаковой `date` |

У `transactions` **нет `updatedAt`**: момент последнего изменения транзакции не хранится.

### 4.4. Enum `TransactionType`

| Значение | Смысл |
|---|---|
| `INCOME` | Доход: зарплата, возврат, подарок |
| `EXPENSE` | Расход: покупка, оплата услуги |

Одна и та же категория может содержать транзакции обоих типов. Сводка тогда покажет её двумя строками — по одной на тип.

---

## 5. Индексы

| Индекс | Таблица | Колонки | Тип | Где используется |
|---|---|---|---|---|
| `users_pkey` | `users` | `id` | PK | Загрузка пользователя по `sub` из JWT на каждом защищённом запросе |
| `users_email_key` | `users` | `email` | UNIQUE | Вход (поиск по email) и проверка занятости email при регистрации |
| `categories_pkey` | `categories` | `id` | PK | Проверка владения категорией |
| `categories_user_id_idx` | `categories` | `user_id` | B-tree | `GET /categories` — все категории пользователя |
| `transactions_pkey` | `transactions` | `id` | PK | Получение, изменение и удаление транзакции |
| `transactions_user_id_date_idx` | `transactions` | `user_id`, `date` | B-tree, составной | Список с фильтром по датам и сортировкой по `date`, `count` для пагинации, сводка за месяц |
| `transactions_category_id_idx` | `transactions` | `category_id` | B-tree | Проверка «в категории есть транзакции» перед удалением и проверка внешнего ключа при `DELETE` категории |

---

## 6. Связи и ссылочная целостность

| Связь | ON DELETE | Смысл |
|---|---|---|
| `categories.user_id` → `users.id` | `CASCADE` | Удаление пользователя удаляет все его категории |
| `transactions.user_id` → `users.id` | `CASCADE` | Удаление пользователя удаляет все его транзакции |
| `transactions.category_id` → `categories.id` | `NO ACTION` | Категорию, в которой есть транзакции, удалить нельзя. Сервис проверяет это заранее и отвечает 409, а внешний ключ — страховка на уровне БД |

Все внешние ключи — `ON UPDATE CASCADE` (значение Prisma по умолчанию); на практике `id` не меняются.

---

## 7. Инварианты, которые обеспечивает код, а не БД

| Инвариант | Где обеспечивается | Что будет при обходе через raw SQL |
|---|---|---|
| Транзакция ссылается только на категорию **своего** пользователя | `TransactionsService.ensureCategoryOwned()` при создании и при смене `categoryId` | БД допустит «чужую» категорию: внешний ключ проверяет только существование |
| `amount > 0`, не больше 2 знаков после запятой | `CreateTransactionDto` (`@IsPositive`, `@IsNumber({ maxDecimalPlaces: 2 })`) | Отрицательные суммы сломают смысл `type` и сводки. Лишние знаки PostgreSQL округлит до 2 |
| Длины `name` и `icon` ≤ 50, `description` ≤ 255 | DTO | В БД длина не ограничена |
| Формат `color` — HEX | `@IsHexColor` в DTO | Любая строка |
| Уникальность email | Сервис (409) + UNIQUE-индекс | При гонке двух регистраций индекс отклонит вторую вставку, но API ответит 500, а не 409 |
| Нельзя удалить категорию с транзакциями | `CategoriesService.remove()` → 409 | Внешний ключ `NO ACTION` не даст удалить категорию |

---

## 8. Как код обращается к БД

Основные запросы, эквивалентные тому, что генерирует Prisma (упрощённо).

**Список транзакций** (`TransactionsRepository.findAllByUser`) — выборка и подсчёт выполняются одной батч-транзакцией (`prisma.$transaction([...])`), поэтому `total` согласован с `items`:

```sql
SELECT * FROM transactions
WHERE user_id = $1 [AND type = $2] [AND category_id = $3] [AND date >= $4] [AND date <= $5]
ORDER BY date DESC, "createdAt" DESC
LIMIT $limit OFFSET ($page - 1) * $limit;

SELECT COUNT(*) FROM transactions WHERE <те же условия>;
```

**Сводка за месяц** (`TransactionsRepository.sumByCategory` + `findCategoriesByIds`). Суммирование делает БД, а итоговую арифметику — `Prisma.Decimal` в сервисе:

```sql
SELECT category_id, type, SUM(amount)
FROM transactions
WHERE user_id = $1 AND date >= $from AND date < $to   -- границы месяца в UTC
GROUP BY category_id, type;

SELECT * FROM categories WHERE id IN (...);           -- названия и цвета для byCategory
```

**Проверка владения** — поиск по паре `(id, user_id)` (`findFirst({ where: { id, userId } })`); `NULL` означает 404. Изменение и удаление потом идут по одному `id`.

---

## 9. Миграции

| Миграция | Что делает |
|---|---|
| `20260913083604_init` | Таблица `users` (`id`, `email`, `name`, `createdAt`, `updatedAt`) и уникальный индекс по `email` |
| `20260913113616_add_user_auth` | Колонка `users.password_hash TEXT NOT NULL`. Добавлена **без значения по умолчанию**, поэтому на непустой таблице миграция не применится — это было допустимо только на пустой dev-базе |
| `20260913132746_add_categories` | Таблица `categories`, индекс по `user_id`, внешний ключ на `users` с `CASCADE` |
| `20260913173853_add_transactions` | Enum `TransactionType`, таблица `transactions`, индексы `(user_id, date)` и `(category_id)`, внешние ключи на `categories` (`NO ACTION`) и `users` (`CASCADE`) |

**Процесс изменения схемы**

1. Отредактировать `apps/backend/prisma/schema.prisma`.
2. Из `apps/backend` выполнить `npx prisma migrate dev --name <описание_изменения>`: команда создаст SQL-миграцию, применит её к локальной БД и перегенерирует Prisma Client.
3. Просмотреть сгенерированный `migration.sql` и закоммитить его **вместе** с изменением схемы, в одном коммите.
4. На других окружениях применять миграции командой `npx prisma migrate deploy`. В `docker-compose.yml` backend-контейнер делает это при старте.

**Правила**

- Применённые миграции не редактируют и не удаляют — любое исправление оформляется новой миграцией.
- Опасные операции требуют плана для существующих данных: `DROP TABLE`, `DROP COLUMN`, переименование (Prisma по умолчанию генерирует его как DROP + ADD, и данные теряются), `NOT NULL`-колонка без `DEFAULT`, новый `UNIQUE`, смена типа колонки или поведения внешнего ключа. См. раздел про миграции в `REVIEW.md`.
- При добавлении полей учитывайте смешанный стиль имён колонок (раздел 3): для snake_case в БД нужен явный `@map("…")`.

---

## 10. Планируемые изменения

В `schema.prisma` закомментирована модель **`Budget`** (таблица `budgets`): `id` (cuid), `name`, `amount Decimal(10,2)`, `period` (строка `monthly`, `weekly` или `yearly`), `userId`, `createdAt`, `updatedAt`. Связи с `User`, индексов и миграции для неё пока нет. Прежде чем включать модель, её нужно доработать под соглашения выше: связь `onDelete`, `@map("user_id")`, индекс по `user_id`.

---

## 11. Работа с данными локально

```bash
# GUI для просмотра и редактирования данных
cd apps/backend && npm run prisma:studio

# psql внутри контейнера
docker exec -it tracker-db psql -U tracker -d tracker
```

Примеры запросов — обратите внимание на кавычки у camelCase-колонок:

```sql
-- последние транзакции пользователя
SELECT t.date, t.type, t.amount, c.name AS category, t.description
FROM transactions t
JOIN categories c ON c.id = t.category_id
JOIN users u ON u.id = t.user_id
WHERE u.email = 'user@example.com'
ORDER BY t.date DESC, t."createdAt" DESC
LIMIT 20;

-- сколько транзакций в каждой категории
SELECT c.name, COUNT(t.id)
FROM categories c
LEFT JOIN transactions t ON t.category_id = c.id
GROUP BY c.id, c.name;
```

- **Сброс локальной БД:** `npx prisma migrate reset` (из `apps/backend`) удаляет **все данные** и применяет миграции заново.
- Данные контейнера лежат в Docker-томе `tracker_postgres_data`. `docker-compose down` их сохраняет, а `docker-compose down -v` удаляет.
