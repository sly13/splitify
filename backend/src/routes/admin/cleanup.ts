import { FastifyInstance } from "fastify";
import { prisma } from "../../config/database";

export async function cleanupRoutes(fastify: FastifyInstance) {
  // Очистка старых платежей
  fastify.post("/api/admin/cleanup/payments", async (request, reply) => {
    try {
      console.log("🧹 Начинаем очистку старых платежей...");

      // Находим все платежи со статусом "created" или "pending"
      const oldPayments = await prisma.payment.findMany({
        where: {
          status: { in: ["created", "pending"] },
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // старше 24 часов
          },
        },
        include: {
          participant: true,
        },
      });

      console.log(`📊 Найдено ${oldPayments.length} старых платежей`);

      if (oldPayments.length > 0) {
        // Обновляем статус участников
        for (const payment of oldPayments) {
          await prisma.billParticipant.update({
            where: { id: payment.participantId },
            data: {
              paymentStatus: "pending",
              paymentId: null,
            },
          });
        }

        // Удаляем старые платежи
        const deleteResult = await prisma.payment.deleteMany({
          where: {
            id: { in: oldPayments.map(p => p.id) },
          },
        });

        console.log(`✅ Удалено ${deleteResult.count} старых платежей`);

        return reply.send({
          success: true,
          message: `Удалено ${deleteResult.count} старых платежей`,
          deletedPayments: oldPayments.map(p => ({
            id: p.id,
            status: p.status,
            createdAt: p.createdAt,
            participant: p.participant.name,
            amount: p.amount.toString(),
          })),
        });
      } else {
        console.log("✅ Старых платежей не найдено");
        return reply.send({
          success: true,
          message: "Старых платежей не найдено",
          deletedPayments: [],
        });
      }
    } catch (error) {
      console.error("❌ Ошибка при очистке платежей:", error);
      return reply.status(500).send({
        success: false,
        error: "Ошибка при очистке платежей",
        details: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    }
  });

  // Показать все активные платежи
  fastify.get("/api/admin/cleanup/payments", async (request, reply) => {
    try {
      const activePayments = await prisma.payment.findMany({
        where: {
          status: { in: ["created", "pending"] },
        },
        include: {
          participant: {
            include: {
              bill: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reply.send({
        success: true,
        activePayments: activePayments.map(payment => ({
          id: payment.id,
          status: payment.status,
          amount: payment.amount.toString(),
          createdAt: payment.createdAt,
          participant: {
            id: payment.participant.id,
            name: payment.participant.name,
            paymentStatus: payment.participant.paymentStatus,
          },
          bill: {
            id: payment.participant.bill.id,
            title: payment.participant.bill.title,
          },
        })),
        count: activePayments.length,
      });
    } catch (error) {
      console.error("❌ Ошибка при получении активных платежей:", error);
      return reply.status(500).send({
        success: false,
        error: "Ошибка при получении активных платежей",
        details: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    }
  });

  // Очистка конкретного платежа
  fastify.delete("/api/admin/cleanup/payments/:paymentId", async (request, reply) => {
    try {
      const { paymentId } = request.params as { paymentId: string };

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          participant: true,
        },
      });

      if (!payment) {
        return reply.status(404).send({
          success: false,
          error: "Платеж не найден",
        });
      }

      // Обновляем статус участника
      await prisma.billParticipant.update({
        where: { id: payment.participantId },
        data: {
          paymentStatus: "pending",
          paymentId: null,
        },
      });

      // Удаляем платеж
      await prisma.payment.delete({
        where: { id: paymentId },
      });

      console.log(`✅ Удален платеж ${paymentId} для участника ${payment.participant.name}`);

      return reply.send({
        success: true,
        message: `Платеж ${paymentId} успешно удален`,
        deletedPayment: {
          id: payment.id,
          status: payment.status,
          participant: payment.participant.name,
          amount: payment.amount.toString(),
        },
      });
    } catch (error) {
      console.error("❌ Ошибка при удалении платежа:", error);
      return reply.status(500).send({
        success: false,
        error: "Ошибка при удалении платежа",
        details: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    }
  });
}
