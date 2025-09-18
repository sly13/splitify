import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { adminAuthMiddleware, AdminRequest } from "../../middleware/adminAuth";

const prisma = new PrismaClient();

export async function adminDataRoutes(fastify: FastifyInstance) {
  // Получение всех пользователей
  fastify.get(
    "/admin/users",
    {
      preHandler: adminAuthMiddleware,
    },
    async (request: AdminRequest, reply) => {
      try {
        const users = await prisma.user.findMany({
          include: {
            billsCreated: {
              select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
              },
            },
            participants: {
              select: {
                id: true,
                billId: true,
                shareAmount: true,
                paymentStatus: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return reply.send({ users });
      } catch (error) {
        console.error("Ошибка при получении пользователей:", error);
        return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
      }
    }
  );

  // Получение всех счетов
  fastify.get(
    "/admin/bills",
    {
      preHandler: adminAuthMiddleware,
    },
    async (request: AdminRequest, reply) => {
      try {
        const bills = await prisma.bill.findMany({
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                firstName: true,
                telegramUserId: true,
              },
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    telegramUserId: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return reply.send({ bills });
      } catch (error) {
        console.error("Ошибка при получении счетов:", error);
        return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
      }
    }
  );

  // Получение статистики
  fastify.get(
    "/admin/stats",
    {
      preHandler: adminAuthMiddleware,
    },
    async (request: AdminRequest, reply) => {
      try {
        const [totalUsers, totalBills, totalPayments, recentBills] =
          await Promise.all([
            prisma.user.count(),
            prisma.bill.count(),
            prisma.payment.count(),
            prisma.bill.count({
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // последние 7 дней
                },
              },
            }),
          ]);

        return reply.send({
          stats: {
            totalUsers,
            totalBills,
            totalPayments,
            recentBills,
          },
        });
      } catch (error) {
        console.error("Ошибка при получении статистики:", error);
        return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
      }
    }
  );
}
