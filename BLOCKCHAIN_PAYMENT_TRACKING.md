# Отслеживание платежей в блокчейне TON

## Обзор

Система автоматически отслеживает платежи в блокчейне TON и обновляет статусы счетов в реальном времени.

## Ключевые особенности

### 1. **Уникальные адреса кошельков**

- Каждый создатель счета использует свой уникальный адрес кошелька TON
- Адрес кошелька сохраняется в профиле пользователя (`User.tonWalletAddress`)
- При создании платежа используется адрес кошелька конкретного создателя

### 2. **Идентификация платежей через комментарии**

- В комментарий транзакции включается bill ID: `Split Bill Payment - bill_12345`
- Это позволяет однозначно связать транзакцию с конкретным счетом
- Система ищет транзакции по комментарию и сумме

### 3. **Автоматический мониторинг**

- Cron job проверяет все ожидающие платежи каждые 30 секунд
- Детальная проверка каждые 5 минут
- Автоматическое обновление статусов в базе данных

## Архитектура системы

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   TON Blockchain│
│                 │    │                  │    │                 │
│ 1. Создание     │───▶│ 2. Payment Intent│    │                 │
│    платежа      │    │    с DeepLink    │    │                 │
│                 │    │                  │    │                 │
│ 3. Открытие     │◀───│ 4. DeepLink с    │───▶│ 5. Транзакция   │
│    кошелька     │    │    комментарием  │    │    с bill ID    │
│                 │    │                  │    │                 │
│                 │    │ 6. Мониторинг   │◀───│ 7. API запросы  │
│                 │    │    блокчейна     │    │    к TON API    │
│                 │    │                  │    │                 │
│ 8. Обновление   │◀───│ 9. Обновление   │    │                 │
│    статуса      │    │    статуса       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Процесс создания платежа

### 1. **Создание Payment Intent**

```typescript
// Backend: /api/payments/intent
const creatorWalletAddress = participant.bill.creator?.tonWalletAddress;
const deeplink = generatePaymentDeeplink(
  "TON",
  amount,
  billId,
  creatorWalletAddress // Адрес кошелька создателя
);
```

### 2. **Генерация DeepLink**

```typescript
// DeepLink формат:
ton://transfer/EQCkWxfyhAkim3g2DjKQQg8T5P4g-Q1-K_jErGcDJZ4i-vqI?amount=250000000&text=Split%20Bill%20Payment%20-%20bill_12345
```

### 3. **Открытие кошелька**

- Frontend открывает DeepLink
- Кошелек TON предзаполняет:
  - Адрес получателя (создатель счета)
  - Сумму платежа
  - Комментарий с bill ID

## Мониторинг блокчейна

### 1. **TonBlockchainService**

```typescript
class TonBlockchainService {
  // Мониторинг транзакций для конкретного адреса
  async monitorWalletTransactions(
    walletAddress: string
  ): Promise<TonTransaction[]>;

  // Поиск платежей по комментарию
  async findPaymentsByComment(
    billId: string,
    walletAddress: string
  ): Promise<TonTransaction[]>;

  // Проверка и обновление статуса платежа
  async checkAndUpdatePaymentStatus(paymentId: string): Promise<boolean>;
}
```

### 2. **PaymentMonitorService**

```typescript
class PaymentMonitorService {
  // Запуск автоматического мониторинга
  startMonitoring(): void;

  // Ручная проверка платежа
  async checkPayment(paymentId: string): Promise<boolean>;
}
```

## API Эндпоинты

### 1. **Создание платежа**

```http
POST /api/payments/intent
{
  "billId": "12345",
  "amount": 0.25,
  "currency": "TON"
}
```

### 2. **Ручная проверка платежа**

```http
POST /api/payments/{paymentId}/check
```

### 3. **Получение информации о платеже**

```http
GET /api/payments/{paymentId}
```

## Безопасность

### 1. **Проверка прав доступа**

- Только участник счета или создатель может проверить платеж
- Проверка по userId и telegramUserId

### 2. **Валидация транзакций**

- Проверка суммы платежа (допуск 0.001 TON)
- Проверка адреса получателя
- Проверка комментария с bill ID

### 3. **Защита от дублирования**

- Проверка существующих активных платежей
- Уникальные external ID для каждого платежа

## Настройка

### 1. **Переменные окружения**

```bash
# TON API для мониторинга блокчейна
TON_API_KEY="your_ton_api_key_here"

# Адреса кошельков создателей хранятся в базе данных
# User.tonWalletAddress
```

### 2. **Зависимости**

```json
{
  "dependencies": {
    "node-cron": "^3.0.3",
    "axios": "^1.6.2"
  }
}
```

## Мониторинг и логирование

### 1. **Логи системы**

- Создание платежей
- Проверка статусов в блокчейне
- Обновление статусов
- Ошибки API

### 2. **Метрики**

- Количество проверяемых платежей
- Время отклика TON API
- Успешность подтверждения платежей

## Примеры использования

### 1. **Создание счета с кошельком**

```typescript
// Создатель подключает кошелек
await userApi.updateProfile({
  tonWalletAddress: "EQCkWxfyhAkim3g2DjKQQg8T5P4g-Q1-K_jErGcDJZ4i-vqI",
});

// Создание счета
await billApi.createBill({
  title: "Ужин в ресторане",
  totalAmount: 1.0,
  currency: "TON",
  creatorWalletAddress: "EQCkWxfyhAkim3g2DjKQQg8T5P4g-Q1-K_jErGcDJZ4i-vqI",
});
```

### 2. **Оплата участником**

```typescript
// Участник нажимает "Оплатить долю"
const paymentIntent = await createPaymentIntent({
  billId: "12345",
  amount: "0.25",
  currency: "TON",
});

// Открывается кошелек с предзаполненными данными
await openPayment(paymentIntent);
```

### 3. **Автоматическое подтверждение**

```typescript
// Система автоматически находит транзакцию:
// - Адрес получателя: EQCkWxfyhAkim3g2DjKQQg8T5P4g-Q1-K_jErGcDJZ4i-vqI
// - Сумма: 0.25 TON
// - Комментарий: "Split Bill Payment - bill_12345"

// Обновляет статус платежа на "confirmed"
// Обновляет статус участника на "paid"
```

## Преимущества системы

1. **Децентрализация** - каждый создатель использует свой кошелек
2. **Прозрачность** - все транзакции видны в блокчейне
3. **Автоматизация** - статусы обновляются без участия пользователя
4. **Безопасность** - проверка суммы и комментария
5. **Масштабируемость** - поддержка множества создателей счетов
