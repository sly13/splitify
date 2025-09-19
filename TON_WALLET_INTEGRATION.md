# Интеграция кошелька TON

## Обзор

В приложение добавлена функциональность подключения кошелька TON для получения платежей. Пользователи могут подключить свой кошелек TON и получать платежи напрямую на него.

## Что было добавлено

### Frontend

1. **TON Connect SDK** - добавлены зависимости `@tonconnect/ui-react` и `@tonconnect/sdk`
2. **Компонент TonWalletConnect** - новый компонент для подключения кошелька TON
3. **Интеграция в настройки** - компонент добавлен в страницу настроек
4. **Стили** - добавлены CSS стили для компонента кошелька
5. **Обновленные типы** - добавлено поле `tonWalletAddress` в интерфейс `User`

### Backend

1. **Обновленная схема БД** - добавлено поле `tonWalletAddress` в модель `User`
2. **API роуты для пользователей** - новые эндпоинты:
   - `GET /api/user/profile` - получение профиля пользователя
   - `PUT /api/user/profile` - обновление профиля (включая адрес кошелька)
   - `GET /api/user/stats` - статистика пользователя
3. **Валидация адресов TON** - базовая проверка формата адреса
4. **Миграция БД** - обновление схемы базы данных

## Как использовать

### Для пользователей

1. Откройте приложение
2. Перейдите в раздел "Настройки"
3. Найдите секцию "Кошелек"
4. Нажмите кнопку "Connect Wallet"
5. Выберите ваш кошелек TON (Tonkeeper, TON Wallet и др.)
6. Подтвердите подключение в кошельке
7. Адрес кошелька автоматически сохранится в вашем профиле

### Для разработчиков

#### API эндпоинты

```typescript
// Получить профиль пользователя
GET /api/user/profile
Response: {
  success: true,
  data: {
    id: string,
    telegramUserId: string,
    username: string,
    firstName: string,
    tonWalletAddress: string | null,
    createdAt: string
  }
}

// Обновить профиль пользователя
PUT /api/user/profile
Body: {
  tonWalletAddress?: string | null,
  username?: string,
  firstName?: string
}
Response: {
  success: true,
  data: User,
  message: string
}

// Получить статистику пользователя
GET /api/user/stats
Response: {
  success: true,
  data: {
    billsCreated: number,
    billsParticipated: number,
    totalPaid: string
  }
}
```

#### Использование компонента

```tsx
import TonWalletConnect from "./components/TonWalletConnect";

function SettingsPage() {
  const handleWalletConnected = (address: string) => {
    console.log("Кошелек подключен:", address);
  };

  const handleWalletDisconnected = () => {
    console.log("Кошелек отключен");
  };

  return (
    <div>
      <TonWalletConnect
        onWalletConnected={handleWalletConnected}
        onWalletDisconnected={handleWalletDisconnected}
      />
    </div>
  );
}
```

## Поддерживаемые кошельки

- **Tonkeeper** - основной кошелек TON
- **TON Wallet** - официальный кошелек TON
- Другие кошельки, поддерживающие TON Connect

## Безопасность

1. **Валидация адресов** - проверка формата адреса TON
2. **Аутентификация** - все API эндпоинты защищены middleware аутентификации
3. **Автоматическое сохранение** - адрес сохраняется только после успешного подключения

## Тестирование

Запустите тестовый скрипт для проверки функциональности:

```bash
cd backend
npx tsx scripts/test-ton-wallet.ts
```

## Будущие улучшения

1. **Отображение баланса** - показ баланса TON в кошельке
2. **История транзакций** - просмотр истории платежей
3. **QR-код для получения** - генерация QR-кода с адресом кошелька
4. **Уведомления о платежах** - push-уведомления о входящих платежах
5. **Поддержка других криптовалют** - интеграция с другими блокчейнами

## Технические детали

### Структура данных

```sql
-- Поле добавлено в таблицу users
ALTER TABLE users ADD COLUMN "tonWalletAddress" TEXT;
```

### Валидация адреса TON

```typescript
function isValidTonAddress(address: string): boolean {
  const tonAddressRegex = /^(UQ|EQ)[A-Za-z0-9_-]{46}$/;
  return tonAddressRegex.test(address) || address.length === 48;
}
```

### TON Connect конфигурация

```typescript
const manifestUrl =
  "https://ton-connect.github.io/demo-dapp-with-react-ui/tonconnect-manifest.json";
const walletsListConfiguration = {
  includeWallets: [
    {
      appName: "tonwallet",
      name: "TON Wallet",
      // ... конфигурация кошелька
    },
    {
      appName: "tonkeeper",
      name: "Tonkeeper",
      // ... конфигурация кошелька
    },
  ],
};
```

## Заключение

Интеграция кошелька TON успешно добавлена в приложение. Пользователи теперь могут подключать свои кошельки TON и получать платежи напрямую. Функциональность полностью интегрирована с существующей системой аутентификации и базой данных.

