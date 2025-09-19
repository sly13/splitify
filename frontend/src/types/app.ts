export interface User {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  tonWalletAddress?: string; // Адрес кошелька TON
  telegramUserId?: string; // ID в Telegram
  ref?: string; // Реферальная ссылка пользователя
}

export interface Bill {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  creator: User; // Создатель счета
  status: BillStatus;
  participants: Participant[];
  payments?: Payment[];
  shareUrl?: string; // Ссылка для присоединения к счету
  creatorWalletAddress?: string; // Адрес кошелька создателя
}

export interface Participant {
  id: string;
  user: User | null; // Может быть null для незарегистрированных пользователей
  name: string; // Имя участника
  telegramUsername?: string; // Username в Telegram
  telegramUserId?: string; // ID в Telegram
  amount?: number; // Устаревшее поле, используйте shareAmount
  shareAmount?: string; // Сумма доли участника
  currency?: string; // Валюта (может отсутствовать в API ответе)
  status?: ParticipantStatus; // Устаревшее поле, используйте paymentStatus
  paymentStatus?: string; // Статус платежа: "pending", "paid", "failed"
  joinedAt?: string; // Дата присоединения
  isPayer?: boolean; // отметка кто заплатил за весь счёт
}

export interface Payment {
  id: string;
  participantId: string;
  amount: number;
  currency: string;
  transactionHash?: string;
  status: PaymentStatus;
  createdAt: string;
  completedAt?: string;
}

export const BillStatus = {
  OPEN: "open",
  CLOSED: "closed",
} as const;

export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];

export const ParticipantStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PAID: "paid",
} as const;

export type ParticipantStatus =
  (typeof ParticipantStatus)[keyof typeof ParticipantStatus];

export const PaymentStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface CreateBillRequest {
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  participants: ParticipantData[];
  splitType: "equal" | "custom";
  creatorWalletAddress?: string;
}

export interface ParticipantData {
  name: string;
  username?: string;
  telegramUsername?: string;
  amount: number;
  percentage?: number;
  isPayer?: boolean;
}

export interface JoinBillRequest {
  billId: string;
  amount: number;
}

export interface PaymentRequest {
  billId: string;
  amount: number;
  currency: string;
}

export interface PaymentIntent {
  paymentId: string;
  provider: string;
  deeplink: string;
  expiresAt: string;
}
