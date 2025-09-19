import { User } from "@prisma/client";

export interface AuthenticatedUser extends User {
  telegramUserId: string;
}

export interface TelegramInitData {
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  auth_date: number;
  hash: string;
}

export interface CreateBillRequest {
  title: string;
  totalAmount: string;
  currency: "USDT" | "TON";
  splitType: "equal" | "custom";
  participants: {
    telegramUserId?: string;
    telegramUsername?: string;
    name: string;
    shareAmount: string;
    isPayer?: boolean;
  }[];
  creatorWalletAddress?: string;
}

export interface CreateBillResponse {
  id: string;
  shareUrl: string;
}

export interface BillDetailsResponse {
  id: string;
  title: string;
  currency: string;
  totalAmount: string;
  splitType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    firstName: string | null;
    username?: string | null;
  };
  participants: {
    id: string;
    name: string;
    shareAmount: string;
    paymentStatus: string;
    isPayer: boolean;
    telegramUsername?: string | null;
    user?: {
      id: string;
      firstName: string | null;
      username?: string | null;
    } | null;
  }[];
  summary: {
    totalPaid: string;
    totalPending: string;
    paidCount: number;
    totalCount: number;
  };
}

export interface PaymentIntentRequest {
  billId: string;
}

export interface PaymentIntentResponse {
  paymentId: string;
  provider: string;
  deeplink: string;
  expiresAt: string;
}

export interface PaymentWebhookRequest {
  externalId: string;
  status: "pending" | "confirmed" | "failed";
}

export interface PaymentWebhookResponse {
  success: boolean;
  message: string;
}

export interface WebSocketMessage {
  type: "payment.updated" | "bill.updated";
  data: any;
}
