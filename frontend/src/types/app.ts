export interface User {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

export interface Bill {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  status: BillStatus;
  participants: Participant[];
  payments: Payment[];
}

export interface Participant {
  id: string;
  user: User;
  amount: number;
  currency: string;
  status: ParticipantStatus;
  joinedAt: string;
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
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
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
}

export interface ParticipantData {
  name: string;
  username?: string;
  telegramUsername?: string;
  amount: number;
  percentage?: number;
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
