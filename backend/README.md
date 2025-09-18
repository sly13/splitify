# Crypto Split Bill Backend

Backend API для приложения Crypto Split Bill с авторизацией через Telegram и поддержкой криптоплатежей.

## Технологии

- **Fastify** - быстрый веб-фреймворк для Node.js
- **PostgreSQL** - реляционная база данных
- **Prisma** - современная ORM для TypeScript
- **WebSocket** - для real-time уведомлений
- **TypeScript** - типизированный JavaScript

## Установка

### Быстрая настройка

```bash
# Запустите скрипт автоматической настройки
./scripts/setup.sh
```

### Ручная настройка

1. Установите зависимости:

```bash
npm install
```

2. Запустите PostgreSQL через Docker:

```bash
# Только база данных
docker-compose up postgres -d

# С pgAdmin для управления БД
docker-compose --profile admin up -d
```

3. Настройте переменные окружения:

```bash
cp env.example .env
```

Отредактируйте `.env` файл:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crypto_split_bill"
TELEGRAM_BOT_TOKEN="your_bot_token_here"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
TON_PROVIDER_URL="https://mock-ton-provider.com"
USDT_PROVIDER_URL="https://mock-usdt-provider.com"
```

4. Настройте базу данных:

```bash
# Создайте миграцию
npm run db:migrate

# Или примените схему напрямую
npm run db:push
```

5. Запустите сервер:

```bash
# Режим разработки
npm run dev

# Продакшн
npm run build
npm start
```

### Доступ к базе данных

- **PostgreSQL**: `localhost:5432`
- **pgAdmin**: `http://localhost:8080` (admin@example.com / admin)

## API Endpoints

### Авторизация

Все запросы требуют заголовок `X-Telegram-Init-Data` с данными от Telegram WebApp.

### Счета (Bills)

#### POST /api/bills

Создание нового счета.

**Body:**

```json
{
  "title": "Обед в ресторане",
  "totalAmount": "100.50",
  "currency": "USDT",
  "splitType": "equal",
  "participants": [
    {
      "telegramUserId": "123456789",
      "name": "Иван",
      "shareAmount": "50.25"
    },
    {
      "telegramUserId": "987654321",
      "name": "Мария",
      "shareAmount": "50.25"
    }
  ]
}
```

#### GET /api/bills/:id

Получение деталей счета.

#### POST /api/bills/:id/close

Закрытие счета (только создатель).

### Платежи (Payments)

#### POST /api/payments/intent

Создание платежного намерения.

**Body:**

```json
{
  "billId": "bill_id_here"
}
```

#### POST /api/payments/webhook/:provider

Webhook для обновления статуса платежа от провайдера.

**Body:**

```json
{
  "externalId": "payment_external_id",
  "status": "confirmed"
}
```

## WebSocket

Подключение к WebSocket для получения real-time уведомлений:

```
ws://localhost:3001/ws/:billId
```

События:

- `payment.updated` - обновление статуса платежа
- `bill.updated` - обновление счета

## База данных

### Модели

- **User** - пользователи Telegram
- **Bill** - счета
- **BillParticipant** - участники счетов
- **Payment** - платежи

### Миграции

```bash
# Создать новую миграцию
npm run db:migrate

# Применить миграции
npm run db:push

# Открыть Prisma Studio
npm run db:studio
```

## Разработка

### Структура проекта

```
src/
├── config/          # Конфигурация (база данных)
├── middleware/      # Middleware (авторизация)
├── routes/          # API маршруты
├── types/           # TypeScript типы
├── utils/           # Утилиты (валидация Telegram)
├── websocket/       # WebSocket сервер
└── index.ts         # Главный файл сервера
```

### Логирование

В режиме разработки логируются все SQL запросы. В продакшне только ошибки.

### Обработка ошибок

Все ошибки логируются и возвращаются в стандартизированном формате.

## Безопасность

- Валидация Telegram initData через HMAC-SHA256
- Проверка времени жизни токена (24 часа)
- Автоматическое создание/обновление пользователей
- Валидация входных данных через Prisma

## Мониторинг

- Health check endpoint: `GET /health`
- Graceful shutdown при получении SIGTERM/SIGINT
- Логирование всех операций
