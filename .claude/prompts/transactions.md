# Новая функциональность

## Контекст
Проект Nest.js + Next + PostgreSQL + Prisma
Что уже есть: User, авторизация JWT, модуль категорий + авторизации

## Задача
Создай TransactionsModule — центральный модуль приложения для учёта доходов и расходов.

## Модель данных

Добавь модель Transaction в schema.prisma:

id (String, uuid, @default(uuid()))
amount (Decimal)
type (Enum: INCOME, EXPENSE)
description (String, nullable)
date (DateTime)
categoryId (String, связь с Category)
userId (String, связь с User)
createdAt (DateTime, @default(now()))

Обнови модели User и Category — добавь обратные связи:

transactions Transaction[]

После изменения схемы создай и примени миграцию:
npx prisma migrate dev --name add-transactions

## Контроллер
Эндпоинты:

POST /transactions — создать транзакцию
GET /transactions — получить список транзакций с query-параметрами:
dateFrom, dateTo, type, categoryId
GET /transactions/summary — получить агрегацию, query-параметры month и year — оба обязательные
GET /transactions/:id — получить одну транзакцию
PATCH /transactions/:id — обновить транзакцию
DELETE /transactions/:id — удалить транзакцию

## Паттерн
Используй @apps/apps/backend/src/categories как образец структуры для backend

## Ограничения

- Не добавлять зависимости если не указано в задаче
- Используй class-validator для DTO
- После реализации собирай проект
