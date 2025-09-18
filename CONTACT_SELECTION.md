# Выбор контактов в Telegram Web Apps

## ❌ Ограничения Telegram Web Apps

**Telegram Web Apps НЕ поддерживает:**

- `selectContact()` - выбор контактов из списка пользователя
- Доступ к списку контактов пользователя
- Получение username по номеру телефона
- Прямой доступ к контактам из адресной книги

Это связано с политикой конфиденциальности Telegram.

## ✅ Реализованные альтернативные решения

### 1. **Система друзей (ContactSelector)**

Компонент для выбора из сохраненных друзей пользователя:

```tsx
<ContactSelector
  onSelect={contact => {
    // contact: { id, name, telegramUsername }
    console.log("Выбран контакт:", contact);
  }}
  placeholder="Выберите из друзей"
/>
```

**Возможности:**

- Выбор из локального списка друзей
- Поиск по имени или username
- Автоматическое добавление @ к username
- Визуальные аватары с инициалами

### 2. **Умный ввод username (UsernameInput)**

Компонент с автодополнением и валидацией:

```tsx
<UsernameInput
  value={username}
  onChange={setUsername}
  suggestions={["@alexey_crypto", "@maria_tg"]}
  placeholder="Введите @username"
/>
```

**Возможности:**

- Автоматическое добавление @
- Автодополнение из истории
- Валидация формата username
- Подсказки и советы

### 3. **Комплексный компонент участников (ParticipantAdder)**

Полнофункциональный компонент для добавления участников:

```tsx
<ParticipantAdder
  participants={participants}
  onParticipantsChange={setParticipants}
  totalAmount={100}
  splitType="equal"
/>
```

**Возможности:**

- Выбор из друзей или ручной ввод
- Автоматический расчет при равномерном разделении
- Валидация общей суммы
- Удаление участников
- Визуальная обратная связь

## 🔮 Будущие возможности

### Telegram Web Apps API (если появится)

```typescript
// Потенциальный API (пока недоступен)
const contact = await window.Telegram.WebApp.selectContact();
// contact: { phone_number, first_name, last_name, user_id }
```

### Альтернативные подходы

#### 1. **QR-код для быстрого добавления**

```tsx
const generateQRCode = (billId: string) => {
  const shareUrl = `https://t.me/your_bot?start=bill_${billId}`;
  // Генерация QR-кода для быстрого доступа
};
```

#### 2. **Ссылки для приглашения**

```tsx
const generateInviteLink = (billId: string) => {
  return `https://t.me/your_bot?start=bill_${billId}`;
};
```

#### 3. **Поиск по номеру телефона (через бота)**

```typescript
// Через Telegram Bot API (требует взаимодействия с ботом)
const searchUser = async (phoneNumber: string) => {
  const response = await fetch(`/api/bot/search-user`, {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
  return response.json();
};
```

## 📱 UX рекомендации

### 1. **Поэтапное добавление**

1. Сначала предложить выбор из друзей
2. Затем возможность ручного ввода
3. Показать историю недавно добавленных

### 2. **Визуальная обратная связь**

- Аватары с инициалами
- Статусы участников (зарегистрирован/гость)
- Цветовая индикация валидности

### 3. **Умные подсказки**

- Автодополнение из истории
- Валидация в реальном времени
- Подсказки по формату username

## 🛠️ Интеграция в существующие компоненты

### Обновление CreateBillPage

```tsx
import { ParticipantAdder } from "../components/ParticipantAdder";

// В компоненте создания счета
<ParticipantAdder
  participants={participants}
  onParticipantsChange={setParticipants}
  totalAmount={parseFloat(totalAmount)}
  splitType={splitType}
/>;
```

### Обновление типов

```typescript
interface Participant {
  id: string;
  name: string;
  telegramUsername?: string;
  telegramUserId?: string;
  shareAmount: string;
}
```

## 🎯 Преимущества реализованного решения

1. **Безопасность** - не требует доступа к контактам
2. **Удобство** - локальный список друзей
3. **Гибкость** - поддержка ручного ввода
4. **Производительность** - быстрый поиск и автодополнение
5. **Совместимость** - работает во всех версиях Telegram

## 📋 Чек-лист для внедрения

- [ ] Добавить компоненты в проект
- [ ] Обновить типы TypeScript
- [ ] Интегрировать в CreateBillPage
- [ ] Протестировать на разных устройствах
- [ ] Добавить обработку ошибок
- [ ] Настроить стили под тему Telegram
