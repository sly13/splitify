import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import { authMiddleware } from "../middleware/auth";

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Получение аналитики долгов пользователя
  fastify.get(
    "/api/analytics/debts",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;

        // Получаем все счета пользователя
        const bills = await prisma.bill.findMany({
          where: {
            OR: [
              { creatorId: userId }, // Счета, созданные пользователем
              {
                participants: {
                  some: {
                    userId: userId,
                  },
                },
              }, // Счета, где пользователь участвует
            ],
          },
          include: {
            participants: {
              include: {
                user: true,
              },
            },
          },
        });

        // Подсчитываем статистику
        const totalBills = bills.length;
        const completedBills = bills.filter(
          bill => bill.status === "completed"
        ).length;
        const activeBills = bills.filter(
          bill => bill.status === "active"
        ).length;

        const totalAmount = bills.reduce(
          (sum, bill) => sum + Number(bill.totalAmount),
          0
        );
        const paidAmount = bills.reduce((sum, bill) => {
          const paid = bill.participants.reduce(
            (participantSum, participant) =>
              participant.paymentStatus === "paid"
                ? participantSum + Number(participant.shareAmount)
                : participantSum,
            0
          );
          return sum + paid;
        }, 0);

        const completionRate =
          totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

        // Подсчитываем долги друзей
        const debtsMap = new Map<
          string,
          {
            name: string;
            telegramUsername?: string;
            totalDebt: number;
            billsCount: number;
            bills: Array<{ id: string; title: string; amount: number }>;
          }
        >();

        bills.forEach(bill => {
          bill.participants.forEach(participant => {
            // Пропускаем текущего пользователя
            if (participant.userId === userId) {
              return;
            }

            // Пропускаем оплаченные доли
            if (participant.paymentStatus === "paid") {
              return;
            }

            const amount = Number(participant.shareAmount);
            if (amount <= 0) return;

            const key = participant.telegramUsername || participant.name;
            const existing = debtsMap.get(key);

            if (existing) {
              existing.totalDebt += amount;
              existing.billsCount += 1;
              existing.bills.push({
                id: bill.id,
                title: bill.title,
                amount: amount,
              });
            } else {
              debtsMap.set(key, {
                name: participant.name,
                telegramUsername: participant.telegramUsername || undefined,
                totalDebt: amount,
                billsCount: 1,
                bills: [
                  {
                    id: bill.id,
                    title: bill.title,
                    amount: amount,
                  },
                ],
              });
            }
          });
        });

        const friendsDebts = Array.from(debtsMap.values()).sort(
          (a, b) => b.totalDebt - a.totalDebt
        );

        return reply.send({
          success: true,
          data: {
            stats: {
              totalBills,
              completedBills,
              activeBills,
              totalAmount,
              paidAmount,
              completionRate,
              remainingAmount: totalAmount - paidAmount,
            },
            friendsDebts,
          },
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
        return reply.status(500).send({
          success: false,
          error: "Failed to fetch analytics data",
        });
      }
    }
  );

  // Получение детальной аналитики по конкретному другу
  fastify.get(
    "/api/analytics/debts/:friendId",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const { friendId } = request.params as { friendId: string };

        // Получаем все счета с участием конкретного друга
        const bills = await prisma.bill.findMany({
          where: {
            OR: [
              { creatorId: userId },
              {
                participants: {
                  some: {
                    userId: userId,
                  },
                },
              },
            ],
            participants: {
              some: {
                OR: [{ telegramUsername: friendId }, { name: friendId }],
              },
            },
          },
          include: {
            participants: {
              include: {
                user: true,
              },
            },
          },
        });

        // Фильтруем только долги этого друга
        const friendDebts = bills
          .map(bill => {
            const friendParticipant = bill.participants.find(
              p =>
                (p.telegramUsername === friendId || p.name === friendId) &&
                p.userId !== userId
            );

            if (
              !friendParticipant ||
              friendParticipant.paymentStatus === "paid"
            ) {
              return null;
            }

            return {
              billId: bill.id,
              billTitle: bill.title,
              amount: Number(friendParticipant.shareAmount),
              currency: bill.currency,
              createdAt: bill.createdAt,
              status: bill.status,
            };
          })
          .filter(Boolean);

        const totalDebt = friendDebts.reduce(
          (sum, debt) => sum + debt!.amount,
          0
        );

        return reply.send({
          success: true,
          data: {
            friendId,
            totalDebt,
            debts: friendDebts,
          },
        });
      } catch (error) {
        console.error("Error fetching friend analytics:", error);
        return reply.status(500).send({
          success: false,
          error: "Failed to fetch friend analytics",
        });
      }
    }
  );
}
