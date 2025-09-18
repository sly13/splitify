import { z } from "zod";

// Схема для участника
export const participantSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  username: z.string().optional(),
  telegramUsername: z.string().optional(),
  amount: z.number().positive("Сумма должна быть больше 0"),
  percentage: z.number().min(0).max(100).optional(),
});

// Схема для создания счета
export const createBillSchema = z
  .object({
    title: z.string().min(1, "Название обязательно"),
    description: z.string().optional(),
    totalAmount: z.number().positive("Общая сумма должна быть больше 0"),
    currency: z.enum(["USDT", "TON"]),
    participants: z
      .array(participantSchema)
      .min(1, "Добавьте хотя бы одного участника"),
    splitType: z.enum(["equal", "custom"]),
  })
  .refine(
    data => {
      // Проверяем, что сумма участников равна общей сумме
      const totalParticipantsAmount = data.participants.reduce(
        (sum, p) => sum + p.amount,
        0
      );
      return Math.abs(totalParticipantsAmount - data.totalAmount) < 0.01;
    },
    {
      message: "Сумма долей участников должна равняться общей сумме",
      path: ["participants"],
    }
  );

// Схема для присоединения к счету
export const joinBillSchema = z.object({
  billId: z.string().min(1, "ID счета обязателен"),
  amount: z.number().positive("Сумма должна быть больше 0"),
});

// Схема для платежа
export const paymentSchema = z.object({
  billId: z.string().min(1, "ID счета обязателен"),
  amount: z.number().positive("Сумма должна быть больше 0"),
  currency: z.enum(["USDT", "TON"]),
});

export type CreateBillData = z.infer<typeof createBillSchema>;
export type JoinBillData = z.infer<typeof joinBillSchema>;
export type PaymentData = z.infer<typeof paymentSchema>;
export type ParticipantData = z.infer<typeof participantSchema>;
