# API

> **Документация:** [Архитектура](architecture.md) · API · [База данных](database.md) · [Гайд разработчика](developer-guide.md)
>
> Документ описывает фактическое поведение backend (`apps/backend`). Коды ответов и примеры сняты с работающего сервера. Интерактивная схема — Swagger UI на `/api`; при расхождении с документом прав код.

---

## 1. Общие сведения

| Параметр | Значение |
|---|---|
| Базовый URL (локально) | `http://localhost:3001` (порт задаёт `PORT`) |
| Префикс и версия | Нет: маршруты начинаются от корня (`/auth/login`, `/transactions`) |
| Формат | JSON, заголовок `Content-Type: application/json` |
| Аутентификация | `Authorization: Bearer <access_token>` |
| Swagger UI | `GET /api` |
| OpenAPI JSON | `GET /api-json` |
| CORS | Один разрешённый origin — `FRONTEND_URL` (по умолчанию `http://localhost:3000`), `credentials: true` |

### Сводная таблица эндпоинтов

| Метод | Путь | Доступ | Назначение | Успех |
|---|---|---|---|---|
| `GET` | `/` | публичный | Health-check | 200 |
| `GET` | `/version` | публичный | Версия API и окружения | 200 |
| `POST` | `/auth/register` | публичный | Регистрация + выдача токена | 201 |
| `POST` | `/auth/login` | публичный | Вход + выдача токена | 200 |
| `GET` | `/categories` | JWT | Все категории пользователя | 200 |
| `POST` | `/categories` | JWT | Создать категорию | 201 |
| `PATCH` | `/categories/:id` | JWT | Изменить категорию | 200 |
| `DELETE` | `/categories/:id` | JWT | Удалить категорию | 204 |
| `GET` | `/transactions` | JWT | Список транзакций: фильтры и пагинация | 200 |
| `GET` | `/transactions/summary` | JWT | Сводка доходов и расходов за месяц | 200 |
| `GET` | `/transactions/:id` | JWT | Одна транзакция | 200 |
| `POST` | `/transactions` | JWT | Создать транзакцию | 201 |
| `PATCH` | `/transactions/:id` | JWT | Изменить транзакцию | 200 |
| `DELETE` | `/transactions/:id` | JWT | Удалить транзакцию | 204 |

Эндпоинтов профиля (`/auth/me`), выхода, обновления токена, `GET /categories/:id` и управления пользователями нет.

---

## 2. Аутентификация

1. Получите токен через `POST /auth/register` или `POST /auth/login` — поле `access_token` в ответе.
2. Передавайте его в каждом запросе к защищённым эндпоинтам: `Authorization: Bearer <access_token>`.
3. Токен — JWT с подписью HS256 и payload:
   ```json
   { "sub": "cmu6qk9zj00006ognzbfr0fk6", "email": "a@docs.test", "iat": 1789722493, "exp": 1789726093 }
   ```
   `sub` — id пользователя. Срок жизни задаёт `JWT_EXPIRES_IN` (в `.env.example` — `3600s`, то есть 1 час).
4. Refresh-токенов нет: после истечения срока нужно снова вызвать `/auth/login`. Серверного logout тоже нет — токен действует до `exp`.
5. На каждый запрос сервер подгружает пользователя из БД по `sub`. Если пользователя удалили, его токен сразу перестаёт работать (401).

Ответ на запрос без токена, с невалидным или истёкшим токеном:

```http
HTTP/1.1 401 Unauthorized
```
```json
{ "message": "Unauthorized", "statusCode": 401 }
```

В Swagger UI нажмите **Authorize** и вставьте токен — он будет подставляться в защищённые методы.

---

## 3. Соглашения

| Тема | Правило |
|---|---|
| **Идентификаторы** | Пользователи и категории — cuid (`cmu6qka6t00036ogn7c78vcyh`), транзакции — UUID v4 (`f52d0e00-7575-47c0-aa0e-a5e175da95d8`). Формат `:id` не валидируется: несуществующий или некорректный id даёт 404 |
| **Владение** | Любая категория и транзакция принадлежит пользователю из токена. Чужой ресурс неотличим от несуществующего: **404**, а не 403. `userId` нельзя передать в теле — это неизвестное поле, ответ 400 |
| **Неизвестные поля** | Любое поле в body или query, которого нет в DTO, отклоняется: `400 "property <name> should not exist"` |
| **Суммы в запросе** | `amount` — JSON-**число** (строка `"10"` не принимается): больше 0, максимум 2 знака после запятой, не больше `9999999999.99` |
| **Суммы в ответе** | Строка с ровно двумя знаками после запятой: `"1500.50"`, `"150000.00"` |
| **Даты в запросе** | Строка, которую понимает `new Date()`: `"2026-09-10"` (= полночь UTC) или `"2026-09-10T00:00:00.000Z"`. Время хранится как есть, в UTC. Frontend всегда отправляет полночь UTC |
| **Даты в ответе** | ISO 8601 в UTC с миллисекундами: `"2026-09-10T00:00:00.000Z"` |
| **Перечисления** | `TransactionType` = `INCOME` \| `EXPENSE`, с учётом регистра (`income` → 400) |
| **PATCH** | Частичное обновление: не переданные поля не меняются, пустое тело `{}` допустимо и возвращает запись как есть. `null` допустим **только** для `description` (очищает его) — см. [ограничения](#10-известные-ограничения) |
| **Тексты ошибок** | Бизнес-ошибки — на русском («Категория не найдена»), ошибки валидации — стандартные английские сообщения class-validator |

---

## 4. Формат ошибок

Все ошибки возвращаются в формате NestJS:

```json
{ "statusCode": 400, "message": ["amount must be a positive number"], "error": "Bad Request" }
```

- `message` — **массив строк** для ошибок валидации (по одной на нарушенное правило) и **строка** для бизнес-ошибок.
- У 401 от guard-а поля `error` нет: `{ "message": "Unauthorized", "statusCode": 401 }`.
- Неизвестный маршрут: `404 { "message": "Cannot GET /nope", "error": "Not Found", "statusCode": 404 }`.
- Непредвиденная ошибка: `500 { "statusCode": 500, "message": "Internal server error" }`.

| Код | Когда возникает |
|---|---|
| `400 Bad Request` | Нарушены правила DTO; неизвестное поле; некорректный query-параметр |
| `401 Unauthorized` | Нет токена, он невалиден или истёк, пользователь удалён; неверные email или пароль на `/auth/login` |
| `404 Not Found` | Ресурс не найден **или принадлежит другому пользователю**; `categoryId` из тела не найден или чужой; неизвестный маршрут |
| `409 Conflict` | Email уже зарегистрирован; удаление категории, в которой есть транзакции |
| `500 Internal Server Error` | Необработанная ошибка — известные случаи перечислены в [ограничениях](#10-известные-ограничения) |

Frontend разбирает этот формат в `ApiError` (`apps/frontend/src/shared/api/api-error.ts`): `statusCode` и `messages: string[]`.

---

## 5. Health

### `GET /`

Проверка, что процесс жив. Подключение к БД **не проверяет**.

```json
{ "status": "ok", "timestamp": "2026-09-18T09:08:13.244Z", "uptime": 31.98 }
```

`uptime` — время работы процесса в секундах.

### `GET /version`

```json
{ "version": "1.0.0", "node": "v22.14.0", "environment": "development" }
```

`version` захардкожен в `apps/backend/src/app.service.ts` и не берётся из `package.json`. `environment` — значение `NODE_ENV` или `development`.

---

## 6. Auth

### `POST /auth/register`

Регистрирует пользователя и сразу выдаёт токен (автологин).

**Тело запроса**

| Поле | Тип | Обязательное | Правила |
|---|---|---|---|
| `email` | string | да | Корректный email (`@IsEmail`). Хранится как введён — **регистр значим** |
| `password` | string | да | Минимум 6 символов |
| `name` | string | нет | Отображаемое имя |

```bash
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@docs.test","password":"123456","name":"Docs A"}'
```

**Ответ `201 Created`**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXU2cWs5emowMDAw…",
  "user": {
    "id": "cmu6qk9zj00006ognzbfr0fk6",
    "email": "a@docs.test",
    "name": "Docs A",
    "createdAt": "2026-09-18T09:08:13.327Z",
    "updatedAt": "2026-09-18T09:08:13.327Z"
  }
}
```

**Ошибки**

| Код | `message` |
|---|---|
| 400 | Например `["password must be longer than or equal to 6 characters"]`, `["email must be an email"]` |
| 409 | `"Пользователь с таким email уже существует"` |

### `POST /auth/login`

**Тело запроса**

| Поле | Тип | Обязательное | Правила |
|---|---|---|---|
| `email` | string | да | Корректный email |
| `password` | string | да | Строка |

**Ответ `200 OK`** — тот же формат, что у регистрации: `{ access_token, user }`.

**Ошибки**

| Код | `message` |
|---|---|
| 400 | Некорректный формат email или отсутствует поле |
| 401 | `"Неверный email или пароль"` — одинаково для неизвестного email и неверного пароля |

---

## 7. Categories

Все эндпоинты требуют JWT и работают только с категориями текущего пользователя.

**Модель `Category`**

| Поле | Тип | Описание |
|---|---|---|
| `id` | string (cuid) | Идентификатор |
| `name` | string | Название, 1–50 символов, не уникально |
| `color` | string | HEX-цвет для UI |
| `icon` | string | Имя иконки, 1–50 символов, например `shopping-cart`. Произвольная строка: backend не проверяет, что такая иконка существует |
| `userId` | string | Владелец |
| `createdAt` | string (ISO) | Дата создания |
| `updatedAt` | string (ISO) | Дата последнего изменения |

### `GET /categories`

Все категории пользователя, отсортированные по `createdAt` по возрастанию. Пагинации и фильтров нет.

**Ответ `200 OK`**

```json
[
  {
    "id": "cmu6qka6t00036ogn7c78vcyh",
    "name": "Продукты",
    "color": "#FF5733",
    "icon": "shopping-cart",
    "userId": "cmu6qk9zj00006ognzbfr0fk6",
    "createdAt": "2026-09-18T09:08:13.589Z",
    "updatedAt": "2026-09-18T09:08:13.589Z"
  }
]
```

### `POST /categories`

**Тело запроса**

| Поле | Тип | Обязательное | Правила |
|---|---|---|---|
| `name` | string | да | Не пустая строка, максимум 50 символов |
| `color` | string | да | HEX-цвет (`@IsHexColor`): `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`. Валидатор принимает цвет и без `#`, но frontend подставляет значение прямо в CSS, поэтому **передавайте цвет с `#`** |
| `icon` | string | да | Не пустая строка, максимум 50 символов |

```bash
curl -X POST http://localhost:3001/categories \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Продукты","color":"#FF5733","icon":"shopping-cart"}'
```

**Ответ `201 Created`** — объект `Category`.

**Ошибки:** `400` — например `["color must be a hexadecimal color"]`.

### `PATCH /categories/:id`

Частичное обновление: любое подмножество полей из `POST /categories` с теми же правилами.

**Ответ `200 OK`** — обновлённая `Category`.

**Ошибки**

| Код | `message` |
|---|---|
| 400 | Нарушены правила полей |
| 404 | `"Категория не найдена"` — нет такой или она чужая |

### `DELETE /categories/:id`

Удаляет категорию, **только если в ней нет транзакций**.

**Ответ `204 No Content`** — тело пустое.

**Ошибки**

| Код | `message` |
|---|---|
| 404 | `"Категория не найдена"` |
| 409 | `"Нельзя удалить категорию, в которой есть транзакции"` |

---

## 8. Transactions

Все эндпоинты требуют JWT и работают только с транзакциями текущего пользователя.

**Модель `Transaction`**

| Поле | Тип | Описание |
|---|---|---|
| `id` | string (UUID) | Идентификатор |
| `amount` | string | Сумма, всегда положительная, с двумя знаками после запятой: `"1500.50"` |
| `type` | `"INCOME"` \| `"EXPENSE"` | Доход или расход. Знак операции задаётся этим полем, а не знаком суммы |
| `description` | string \| null | Комментарий, до 255 символов |
| `date` | string (ISO) | Дата операции, которую задаёт пользователь |
| `categoryId` | string | Категория (своя) |
| `userId` | string | Владелец |
| `createdAt` | string (ISO) | Момент создания записи. Поля `updatedAt` у транзакций нет |

### `GET /transactions`

Страница транзакций пользователя, отсортированная по `date` по убыванию, а при равной дате — по `createdAt` по убыванию.

**Query-параметры**

| Параметр | Тип | По умолчанию | Правила и семантика |
|---|---|---|---|
| `page` | int | `1` | От 1 до 1 000 000 |
| `limit` | int | `10` | От 1 до 100 |
| `dateFrom` | дата | — | `date >= dateFrom`, включительно |
| `dateTo` | дата | — | `date <= dateTo`, включительно, сравнивается с точным моментом времени |
| `type` | `INCOME` \| `EXPENSE` | — | Фильтр по типу |
| `categoryId` | string | — | Точное совпадение. Чужой или несуществующий id не даёт ошибки — просто пустой результат |

Фильтры комбинируются через AND; `dateFrom` и `dateTo` можно передавать по отдельности.

```bash
curl "http://localhost:3001/transactions?dateFrom=2026-09-01&dateTo=2026-09-30&type=EXPENSE" \
  -H "Authorization: Bearer $TOKEN"
```

**Ответ `200 OK`**

```json
{
  "items": [
    {
      "id": "f52d0e00-7575-47c0-aa0e-a5e175da95d8",
      "amount": "1500.50",
      "type": "EXPENSE",
      "description": "Продукты на неделю",
      "date": "2026-09-10T00:00:00.000Z",
      "categoryId": "cmu6qka6t00036ogn7c78vcyh",
      "userId": "cmu6qk9zj00006ognzbfr0fk6",
      "createdAt": "2026-09-18T09:08:13.608Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

| Поле | Описание |
|---|---|
| `items` | Транзакции текущей страницы |
| `total` | Всего транзакций по фильтрам. Считается в той же транзакции БД, что и выборка, поэтому согласован с `items` |
| `page`, `limit` | Фактически применённые значения, включая значения по умолчанию |
| `totalPages` | `ceil(total / limit)`. При пустом результате — **`0`** |

Страница за пределами диапазона не считается ошибкой: `?page=5` при `totalPages: 1` вернёт `200` с `items: []`.

**Ошибки:** `400` — например `["limit must not be greater than 100"]`, `["dateFrom must be a Date instance"]`.

> **Breaking change (PR #3).** Раньше `GET /transactions` возвращал массив транзакций, теперь возвращает объект с пагинацией.

### `GET /transactions/summary`

Сводка доходов и расходов за календарный месяц.

**Query-параметры**

| Параметр | Тип | Обязательный | Правила |
|---|---|---|---|
| `month` | int | да | От 1 до 12 |
| `year` | int | да | От 2000 до 2100 |

Период — `[YYYY-MM-01T00:00:00Z; первое число следующего месяца 00:00:00Z)` в **UTC**.

```bash
curl "http://localhost:3001/transactions/summary?month=9&year=2026" -H "Authorization: Bearer $TOKEN"
```

**Ответ `200 OK`**

```json
{
  "month": 9,
  "year": 2026,
  "totalIncome": "150100.00",
  "totalExpense": "1500.50",
  "balance": "148599.50",
  "byCategory": [
    { "categoryId": "cmu6qka7100056ognwpoimihh", "name": "Зарплата", "color": "#22C55E", "icon": "wallet", "type": "INCOME", "total": "150000.00" },
    { "categoryId": "cmu6qka6t00036ogn7c78vcyh", "name": "Продукты", "color": "#FF5733", "icon": "shopping-cart", "type": "EXPENSE", "total": "1500.50" },
    { "categoryId": "cmu6qka6t00036ogn7c78vcyh", "name": "Продукты", "color": "#FF5733", "icon": "shopping-cart", "type": "INCOME", "total": "100.00" }
  ]
}
```

| Поле | Описание |
|---|---|
| `totalIncome`, `totalExpense` | Суммы по типам за месяц |
| `balance` | `totalIncome − totalExpense`, может быть отрицательным |
| `byCategory` | Группы **(категория, тип)**, отсортированные по `total` по убыванию независимо от типа. Если в категории есть и доходы, и расходы, она встречается **дважды**, как «Продукты» в примере |

Месяц без транзакций: все суммы `"0.00"`, `byCategory: []`.

**Ошибки:** `400` — `month` или `year` не переданы или вне диапазона.

> Маршрут объявлен в контроллере раньше `GET /transactions/:id` — иначе `summary` воспринимался бы как `id`.

### `GET /transactions/:id`

**Ответ `200 OK`** — объект `Transaction`.

**Ошибки:** `404 "Транзакция не найдена"` — нет такой или она чужая.

### `POST /transactions`

**Тело запроса**

| Поле | Тип | Обязательное | Правила |
|---|---|---|---|
| `amount` | number | да | Больше 0, не больше 2 знаков после запятой, максимум `9999999999.99` |
| `type` | `INCOME` \| `EXPENSE` | да | С учётом регистра |
| `date` | дата | да | См. [соглашения](#3-соглашения) |
| `categoryId` | string | да | Не пустой; категория должна принадлежать пользователю |
| `description` | string | нет | Максимум 255 символов |

```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount":1500.5,"type":"EXPENSE","description":"Продукты на неделю","date":"2026-09-10T00:00:00.000Z","categoryId":"cmu6qka6t00036ogn7c78vcyh"}'
```

**Ответ `201 Created`** — объект `Transaction` (`amount` уже строкой: `"1500.50"`).

**Ошибки**

| Код | `message` |
|---|---|
| 400 | Например `["amount must be a positive number"]`, `["amount must be a number conforming to the specified constraints"]` (строка или больше 2 знаков после запятой), `["type must be one of the following values: INCOME, EXPENSE"]`, `["property userId should not exist"]` |
| 404 | `"Категория не найдена"` — `categoryId` не существует или принадлежит другому пользователю |

### `PATCH /transactions/:id`

Частичное обновление: любое подмножество полей из `POST /transactions` с теми же правилами. Если передан `categoryId`, заново проверяется, что категория принадлежит пользователю. Чтобы очистить описание, передайте `"description": null`.

**Ответ `200 OK`** — обновлённая `Transaction`.

**Ошибки**

| Код | `message` |
|---|---|
| 400 | Нарушены правила полей |
| 404 | `"Транзакция не найдена"` или `"Категория не найдена"` (новый `categoryId` не найден или чужой) |

### `DELETE /transactions/:id`

**Ответ `204 No Content`.**

**Ошибки:** `404 "Транзакция не найдена"`; повторное удаление тоже даёт 404.

---

## 9. Схемы ответов (TypeScript)

```ts
type TransactionType = 'INCOME' | 'EXPENSE'

interface User {
  id: string // cuid
  email: string
  name: string | null
  createdAt: string // ISO 8601, UTC
  updatedAt: string
}

interface AuthResponse {
  access_token: string
  user: User // без passwordHash
}

interface Category {
  id: string // cuid
  name: string
  color: string // HEX
  icon: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface Transaction {
  id: string // UUID
  amount: string // "1500.50"
  type: TransactionType
  description: string | null
  date: string
  categoryId: string
  userId: string
  createdAt: string
}

interface PaginatedTransactions {
  items: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number // 0, если total = 0
}

interface CategorySummary {
  categoryId: string
  name: string
  color: string
  icon: string
  type: TransactionType
  total: string
}

interface TransactionSummary {
  month: number
  year: number
  totalIncome: string
  totalExpense: string
  balance: string // может быть отрицательным
  byCategory: CategorySummary[]
}
```

Источник на backend — классы `*Entity` в `apps/backend/src/*/entities/` и `AuthResponseDto`.

---

## 10. Известные ограничения

| Ограничение | Поведение | Что делать клиенту |
|---|---|---|
| `null` в обязательном поле при `PATCH` | `PartialType` навешивает `@IsOptional`, который пропускает `null`. Ошибку выбрасывает уже Prisma, и ответ — **500**, а не 400. Проверено для `amount` у транзакций и `name` у категорий; то же касается `type`, `date`, `categoryId`, `color`, `icon` | Не передавать `null`, а просто опускать поле. Исключение — `description` |
| Email чувствителен к регистру | `User@x.com` и `user@x.com` — два разных аккаунта. Вход с другим регистром даёт 401 | Нормализовать email на клиенте, если нужно |
| Одновременная регистрация с одним email | Проверка «email свободен» и вставка — два отдельных запроса. При гонке уникальный индекс БД отклонит второй запрос, но ответом будет 500, а не 409. Это видно из кода (`UserService.createUser`), нагрузочно не проверялось | Считать 500 на регистрации возможным дублем |
| Нет refresh-токена, logout и отзыва токена | Токен живёт `JWT_EXPIRES_IN`, затем 401 | Повторный `/auth/login` |
| Нет ограничения частоты запросов | На `/auth/login` нет throttling | — |
| `GET /` не проверяет БД | Без БД backend не стартует (`$connect` при инициализации), но если PostgreSQL стала недоступна после старта, `GET /` всё равно отвечает 200 | Для проверки готовности используйте запрос, который ходит в БД |
| Цвет категории без `#` | Валидатор принимает `FF5733`, но во frontend такой цвет не отрисуется | Передавать `#FF5733` |
| Названия категорий не уникальны | Можно создать две категории «Продукты» | — |
| Строка из пробелов проходит `@IsNotEmpty` | `name: "   "` будет сохранено | Обрезать пробелы на клиенте |

---

## 11. Соответствие типам frontend

Общего пакета типов нет: frontend вручную повторяет контракт. При изменении DTO или Entity правьте обе стороны. Пути frontend даны относительно `apps/frontend/src`.

| Backend (`apps/backend/src`) | Frontend |
|---|---|
| `user/entities/user.entity.ts` → `UserEntity` | `entities/user/model/types.ts` → `User` |
| `auth/dto/auth-response.dto.ts` → `AuthResponseDto` | `entities/session/model/types.ts` → `AuthResponse` (+ `Session` после `toSession()`) |
| `categories/entities/category.entity.ts` → `CategoryEntity` | `entities/category/model/types.ts` → `Category` |
| `transactions/entities/transaction.entity.ts`, `paginated-transactions.entity.ts` | `entities/transaction/model/types.ts` → `Transaction`, `PaginatedTransactions` |
| `transactions/dto/create-transaction.dto.ts` → `CreateTransactionDto` | `entities/transaction/model/types.ts` → `CreateTransactionPayload`; правила — `features/transaction/create/model/schema.ts` |
| `auth/dto/register.dto.ts`, `auth/dto/login.dto.ts` | `features/auth/register/model/schema.ts`, `features/auth/login/model/schema.ts` |

Сейчас frontend использует `POST /auth/register`, `POST /auth/login`, `GET /categories`, `GET /transactions` и `POST /transactions`. Сводка, CRUD категорий, получение, изменение и удаление отдельной транзакции в UI пока не задействованы. В `apiClient` есть только методы `get` и `post`.
