# Трекер расходов

Монорепозиторий для приложения учета личных финансов.

## Структура проекта

```
tracker/
├── apps/
│   ├── frontend/          # Next.js приложение
│   └── backend/           # Nest.js API
├── packages/              # Общие пакеты (для будущего использования)
├── docker-compose.yml     # Конфигурация Docker
└── package.json          # Корневой package.json
```

## Стек технологий

### Frontend
- **Next.js 15** - React фреймворк
- **TypeScript** - типизация
- **CSS** - стилизация (без внешних библиотек)

### Backend
- **Nest.js 10** - Node.js фреймворк
- **TypeScript** - типизация
- **Prisma** - ORM
- **PostgreSQL** - база данных
- **Swagger** - документация API

## Требования

- Node.js 20+
- npm
- Docker и Docker Compose (опционально)

## Установка зависимостей

```bash
# Установка зависимостей для всех проектов
npm run install:all

# Или по отдельности
cd apps/frontend && npm install
cd apps/backend && npm install
```

## Настройка переменных окружения

### Frontend
```bash
cd apps/frontend
cp .env.example .env
```

### Backend
```bash
cd apps/backend
cp .env.example .env
```

## Запуск с Docker

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

После запуска:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Swagger документация: http://localhost:3001/api

## Запуск без Docker

### База данных
Запустите PostgreSQL локально или используйте docker-compose только для БД:
```bash
docker-compose up postgres -d
```

### Backend
```bash
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd apps/frontend
npm install
npm run dev
```

## Полезные команды

### Backend
```bash
npm run dev              # Запуск в режиме разработки
npm run build            # Сборка проекта
npm run start            # Запуск production версии
npm run lint             # Проверка линтером
npm run typecheck        # Проверка типов
npm run prisma:generate  # Генерация Prisma клиента
npm run prisma:migrate   # Применение миграций
npm run prisma:studio    # Открыть Prisma Studio
```

### Frontend
```bash
npm run dev              # Запуск в режиме разработки
npm run build            # Сборка проекта
npm run start            # Запуск production версии
npm run lint             # Проверка линтером
npm run typecheck        # Проверка типов
```

## Prisma

### Создание миграции
```bash
cd apps/backend
npx prisma migrate dev --name название_миграции
```

### Применение миграций
```bash
npx prisma migrate deploy
```

### Prisma Studio (GUI для БД)
```bash
npx prisma studio
```

## Структура базы данных

На данный момент реализована базовая модель:
- `User` - пользователи

Закомментированные модели для будущей реализации:
- `Category` - категории расходов
- `Expense` - расходы
- `Budget` - бюджеты

## Следующие шаги

1. Установить зависимости: `npm run install:all`
2. Настроить переменные окружения
3. Запустить проект через Docker или локально
4. Начать разработку функционала

## Разработка

- Frontend доступен на порту 3000
- Backend API на порту 3001
- PostgreSQL на порту 5432
- Swagger документация доступна по адресу `/api`

## Примечания

- Проект настроен без установки зависимостей
- Docker конфигурация готова к использованию
- Prisma схема содержит базовую структуру
- Frontend имеет темную тему по умолчанию
