# 📋 Резюме: Форматы адресов TON

## 🎯 Основные форматы

### 1. **Raw формат (рекомендуется для хранения)**

```
0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f
```

- **Структура:** `workchain:hash`
- **Workchain:** 0 (основная сеть) или -1 (тестовая сеть)
- **Hash:** 64 символа hex (0-9, a-f)
- **Длина:** 67 символов (2 + 1 + 64)

### 2. **User-friendly формат (для отображения)**

```
UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH
EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH
```

- **UQ:** Bounceable адрес (может вернуть средства при ошибке)
- **EQ:** Non-bounceable адрес (не может вернуть средства)
- **Длина:** 48 символов
- **Остальные символы:** Base64url (A-Z, a-z, 0-9, \_, -)

## 🔧 Что было исправлено

### 1. **Создана улучшенная валидация** (`/backend/src/utils/tonAddress.ts`)

- ✅ Проверка raw формата (workchain:hash)
- ✅ Проверка user-friendly формата (UQ/EQ)
- ✅ Валидация workchain (только 0 или -1)
- ✅ Валидация hash (64 hex символа)
- ✅ Проверка base64url для UQ/EQ формата

### 2. **Обновлена функция генерации DeepLink**

- ✅ Использует новую функцию `createTonPaymentDeeplink`
- ✅ Правильная валидация адресов
- ✅ Корректное формирование URL параметров

### 3. **Улучшена валидация в API**

- ✅ Заменена старая валидация в `/api/user/profile`
- ✅ Более строгие проверки формата адреса

## 📊 Рекомендации по использованию

### **Хранение в базе данных:**

```sql
-- Рекомендуется хранить в raw формате
tonWalletAddress VARCHAR(67) -- "0:" + 64 hex символа
```

### **Отображение пользователю:**

```typescript
// Сокращенный формат для UI
formatTonAddressForDisplay(address); // "0:83dfd5...51e0f"
```

### **Deep Links для платежей:**

```typescript
// Автоматическая генерация ссылок
createTonPaymentDeeplink(address, amount, comment);
// "ton://transfer/0:83dfd552...?amount=1000000000&text=Payment"
```

### **API запросы к TON:**

```typescript
// Используем raw формат для TON API
const tonApiUrl = `https://tonapi.io/v2/accounts/${rawAddress}/events`;
```

## 🚨 Проблемы, которые были исправлены

### 1. **Старая валидация была слишком слабой:**

```typescript
// ❌ Старый код принимал любые 48-символьные строки
const tonAddressRegex = /^(UQ|EQ)[A-Za-z0-9_-]{46}$/;
return tonAddressRegex.test(address) || address.length === 48; // Опасно!
```

### 2. **Новая валидация строгая:**

```typescript
// ✅ Новый код проверяет корректность формата
function isValidTonAddress(address: string): boolean {
  // Проверяет workchain (0 или -1)
  // Проверяет hash (64 hex символа)
  // Проверяет base64url для UQ/EQ
}
```

## 🔄 Миграция существующих данных

### **Проверка существующих адресов:**

```sql
-- Найти все адреса кошельков
SELECT id, tonWalletAddress FROM users WHERE tonWalletAddress IS NOT NULL;

-- Проверить их валидность (нужно запустить скрипт)
```

### **Обновление схемы базы данных:**

```sql
-- Увеличить длину поля для raw формата
ALTER TABLE users ALTER COLUMN tonWalletAddress TYPE VARCHAR(67);
```

## 📝 Примеры корректных адресов

### **Raw формат (для хранения):**

```
0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f
-1:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f
```

### **User-friendly формат (для отображения):**

```
UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH
EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH
```

### **Deep Link для платежа:**

```
ton://transfer/0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f?amount=1000000000&text=Split%20Bill%20Payment%20-%20bill_cmfqzvmd000035xoj9e574idg
```

## ✅ Следующие шаги

1. **Протестировать новую валидацию** на существующих данных
2. **Обновить схему базы данных** для поддержки raw формата
3. **Мигрировать существующие адреса** к единому формату
4. **Добавить библиотеку TON** для более точной валидации
5. **Обновить фронтенд** для работы с новыми форматами
