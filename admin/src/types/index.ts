export interface Admin {
  id: string;
  username: string;
}

export interface User {
  id: string;
  telegramUserId: string;
  username?: string;
  firstName?: string;
  createdAt: string;
  billsCreated: Bill[];
  participants: BillParticipant[];
}

export interface Bill {
  id: string;
  title: string;
  currency: string;
  totalAmount: string;
  splitType: string;
  creatorId: string;
  creator: User;
  participants: BillParticipant[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillParticipant {
  id: string;
  billId: string;
  userId?: string;
  user?: User;
  telegramUserId: string;
  name: string;
  shareAmount: string;
  paymentStatus: string;
  paymentId?: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  billId: string;
  participantId: string;
  provider: string;
  status: string;
  amount: string;
  deeplink?: string;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  totalUsers: number;
  totalBills: number;
  totalPayments: number;
  recentBills: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
}
