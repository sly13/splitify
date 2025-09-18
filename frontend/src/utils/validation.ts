import { z } from "zod";

// Схема для участника
export const participantSchema = z.object({
  id: z.string().optional(), // Добавляем ID для участника
  name: z.string().min(1, "Имя обязательно"),
  username: z.string().optional(),
  telegramUsername: z.string().optional(),
  telegramUserId: z.string().optional(),
  amount: z.number().positive("Сумма должна быть больше 0"),
  percentage: z.number().min(0).max(100).optional(),
  isPayer: z.boolean().optional(),
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
      .min(2, "Добавьте минимум 2 участника"),
    splitType: z.enum(["equal", "custom"]),
    creatorWalletAddress: z.string().optional(),
  })
  .refine(
    data => {
      // Проверяем, что сумма участников не меньше общей суммы
      const totalParticipantsAmount = data.participants.reduce(
        (sum, p) => sum + p.amount,
        0
      );
      // Если сумма долей меньше общей суммы - ошибка
      // Если сумма долей больше общей суммы - это норма (округление)
      return totalParticipantsAmount >= data.totalAmount - 0.01;
    },
    {
      message: "Сумма долей участников не может быть меньше общей суммы счета",
      path: ["participants"],
    }
  )
  .refine(
    data => {
      // Проверяем, что хотя бы один участник отмечен как плательщик
      return data.participants.some(p => p.isPayer === true);
    },
    {
      message: "Необходимо указать, кто заплатил за счёт",
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
