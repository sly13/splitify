# 📋 Форматы адресов TON

## 🔍 Основные форматы адресов TON

### 1. **Raw Address (Hex)**

```
0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f
```

- **Формат:** `workchain:hash` (например, `0:83dfd552...`)
- **Длина:** 48 символов (2 + 46)
- **Использование:** Внутренний формат блокчейна TON

### 2. **User-Friendly Address (UQ/EQ)**

```
UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH
EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH
```

- **Формат:** `UQ` или `EQ` + 46 символов
- **Длина:** 48 символов
- **Использование:** Пользовательский формат для кошельков

### 3. **Bounceable/Non-bounceable**

```
UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH (bounceable)
UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH (non-bounceable)
```

## 🛠️ Валидация адресов в коде

### Backend (`/backend/src/routes/users.ts`)

```typescript
function isValidTonAddress(address: string): boolean {
  // Базовая проверка формата адреса TON
  // TON адреса обычно начинаются с UQ, EQ, или имеют длину 48 символов
  const tonAddressRegex = /^(UQ|EQ)[A-Za-z0-9_-]{46}$/;
  return tonAddressRegex.test(address) || address.length === 48;
}
```

### Проблемы с текущей валидацией:

- ❌ Не проверяет корректность workchain (должен быть 0 или -1)
- ❌ Не проверяет контрольную сумму
- ❌ Принимает любые 48-символьные строки

## 🔧 Рекомендуемые исправления

### 1. Улучшенная валидация

```typescript
function isValidTonAddress(address: string): boolean {
  // Проверяем raw формат (workchain:hash)
  if (address.includes(":")) {
    const parts = address.split(":");
    if (parts.length !== 2) return false;

    const workchain = parseInt(parts[0]);
    const hash = parts[1];

    // Workchain должен быть 0 или -1
    if (workchain !== 0 && workchain !== -1) return false;

    // Hash должен быть 64 символа hex
    if (!/^[0-9a-fA-F]{64}$/.test(hash)) return false;

    return true;
  }

  // Проверяем user-friendly формат (UQ/EQ)
  if (address.startsWith("UQ") || address.startsWith("EQ")) {
    if (address.length !== 48) return false;

    // Проверяем, что остальные символы - это base64url
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    return base64urlRegex.test(address.slice(2));
  }

  return false;
}
```

### 2. Нормализация адресов

```typescript
function normalizeTonAddress(address: string): string {
  // Приводим к единому формату для хранения
  if (address.includes(":")) {
    return address; // Уже в raw формате
  }

  if (address.startsWith("UQ") || address.startsWith("EQ")) {
    // Конвертируем из user-friendly в raw формат
    // Это требует библиотеки для декодирования TON адресов
    return convertToRawFormat(address);
  }

  throw new Error("Invalid TON address format");
}
```

## 📊 Форматы для разных целей

### 1. **Хранение в базе данных**

```sql
-- Рекомендуется хранить в raw формате
tonWalletAddress VARCHAR(67) -- "0:" + 64 hex символа
```

### 2. **Отображение пользователю**

```typescript
function formatAddressForDisplay(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
```

### 3. **Deep Links для платежей**

```typescript
function generatePaymentDeeplink(
  address: string,
  amount: string,
  comment?: string
): string {
  // TON Deep Link формат
  return `ton://transfer/${address}?amount=${amount}&text=${encodeURIComponent(
    comment || ""
  )}`;
}
```

### 4. **API запросы к TON**

```typescript
// Для TON API используем raw формат
const tonApiUrl = `https://tonapi.io/v2/accounts/${rawAddress}/events`;
```

## 🚨 Проблемы в текущем коде

### 1. **Некорректная валидация**

```typescript
// Текущий код принимает любые 48-символьные строки
const tonAddressRegex = /^(UQ|EQ)[A-Za-z0-9_-]{46}$/;
return tonAddressRegex.test(address) || address.length === 48; // ❌ Опасно!
```

### 2. **Отсутствие нормализации**

- Адреса могут приходить в разных форматах
- Нет единого формата для хранения
- Могут возникать проблемы при сравнении

### 3. **Тестовые данные**

```typescript
// В тестах используется некорректный адрес
const testWalletAddress = "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH"; // ❌ Невалидный
```

## ✅ Рекомендации

### 1. **Использовать библиотеку TON**

```bash
npm install @ton/core @ton/crypto
```

### 2. **Улучшить валидацию**

```typescript
import { Address } from "@ton/core";

function isValidTonAddress(address: string): boolean {
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
}
```

### 3. **Нормализация при сохранении**

```typescript
function normalizeTonAddress(address: string): string {
  const parsed = Address.parse(address);
  return parsed.toString(); // Возвращает в raw формате
}
```

### 4. **Обновить схему базы данных**

```sql
-- Увеличить длину поля для raw формата
ALTER TABLE users ALTER COLUMN tonWalletAddress TYPE VARCHAR(67);
```

## 🔄 Миграция существующих данных

1. **Проверить все существующие адреса**
2. **Валидировать их корректность**
3. **Нормализовать к единому формату**
4. **Обновить код для работы с новым форматом**

## 📝 Примеры корректных адресов

```typescript
// Raw формат (рекомендуется для хранения)
"0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f";

// User-friendly формат (для отображения)
"UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH";
"EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH";

// Deep Link для платежа
"ton://transfer/0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f?amount=1000000000&text=Payment";
```
