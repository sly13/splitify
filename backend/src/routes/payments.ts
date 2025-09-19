import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import {
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentWebhookRequest,
  PaymentWebhookResponse,
} from "../types";
import Decimal from "decimal.js";
import { tonBlockchainService } from "../services/tonBlockchainService";
import { createTonPaymentDeeplink } from "../utils/tonAddress";

export async function paymentsRoutes(fastify: FastifyInstance) {
  // Создание платежного намерения
  fastify.post<{ Body: PaymentIntentRequest }>(
    "/api/payments/intent",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { billId } = request.body;
        const userId = request.user!.id;
        const telegramUserId = request.user!.telegramUserId;

        console.log("=== PAYMENT INTENT REQUEST START ===");
        console.log("📋 Request details:", {
          billId,
          userId,
          telegramUserId,
          userType: typeof userId,
          telegramUserIdType: typeof telegramUserId,
          headers: {
            "x-test-mode": request.headers["x-test-mode"],
            "x-telegram-init-data": request.headers["x-telegram-init-data"]
              ? "present"
              : "missing",
          },
        });

        // Проверяем существование счета
        console.log("🔍 Checking if bill exists...");
        const bill = await prisma.bill.findUnique({
          where: { id: billId },
          select: {
            id: true,
            title: true,
            currency: true,
            creatorId: true,
            status: true,
          },
        });

        console.log("📄 Bill check result:", bill);

        if (!bill) {
          console.log("❌ Bill not found in database!");
          return reply.status(404).send({ error: "Bill not found" });
        }

        // Получаем всех участников счета для диагностики
        console.log("👥 Getting all participants for diagnostics...");
        const allParticipants = await prisma.billParticipant.findMany({
          where: { billId },
          select: {
            id: true,
            userId: true,
            telegramUserId: true,
            name: true,
            paymentStatus: true,
            shareAmount: true,
          },
        });

        console.log(
          "👥 All participants found:",
          JSON.stringify(allParticipants, null, 2)
        );

        // Найти участника для текущего пользователя
        console.log("🔍 Searching for current user's participant...");
        console.log("Search criteria:");
        console.log("  - billId:", billId);
        console.log("  - userId:", userId);
        console.log("  - telegramUserId:", telegramUserId);

        const participant = await prisma.billParticipant.findFirst({
          where: {
            billId,
            OR: [{ userId: userId }, { telegramUserId: telegramUserId }],
          },
          include: {
            bill: {
              include: {
                creator: true,
              },
            },
          },
        });

        if (participant) {
          console.log("✅ Found participant:", {
            id: participant.id,
            name: participant.name,
            userId: participant.userId,
            telegramUserId: participant.telegramUserId,
            paymentStatus: participant.paymentStatus,
            shareAmount: participant.shareAmount.toString(),
            billTitle: participant.bill.title,
          });
        } else {
          console.log("❌ PARTICIPANT NOT FOUND!");
          console.log("🔍 Debug info:");
          console.log("  - User ID we're looking for:", userId);
          console.log(
            "  - Telegram User ID we're looking for:",
            telegramUserId
          );
          console.log("  - Available participants:");
          allParticipants.forEach((p, i) => {
            console.log(`    ${i + 1}. ${p.name}:`);
            console.log(
              `       - userId: ${p.userId} (match: ${p.userId === userId})`
            );
            console.log(
              `       - telegramUserId: ${p.telegramUserId} (match: ${
                p.telegramUserId === telegramUserId
              })`
            );
          });

          return reply.status(404).send({ error: "Participant not found" });
        }

        console.log("💰 Checking payment status and conditions...");

        if (participant.paymentStatus === "paid") {
          console.log("❌ Payment already completed");
          return reply.status(400).send({ error: "Payment already completed" });
        }

        // Проверяем, есть ли уже активный платеж
        console.log("🔍 Checking for existing payment...");
        const existingPayment = await prisma.payment.findFirst({
          where: {
            participantId: participant.id,
            status: { in: ["created", "pending"] },
          },
        });

        console.log("Existing payment:", existingPayment);

        if (existingPayment) {
          console.log("❌ Payment already in progress");
          return reply
            .status(400)
            .send({ error: "Payment already in progress" });
        }

        // Получаем адрес кошелька создателя счета
        console.log("🏦 Getting creator wallet address...");
        console.log("Bill currency:", participant.bill.currency);
        console.log("Creator info:", participant.bill.creator);

        let creatorWalletAddress = participant.bill.creator?.tonWalletAddress;
        console.log("Creator wallet address:", creatorWalletAddress);

        if (!creatorWalletAddress && participant.bill.currency === "TON") {
          console.log(
            "❌ Creator wallet address not found in bill, checking user profile..."
          );

          // Попробуем получить адрес кошелька из профиля пользователя
          const userProfile = await prisma.user.findUnique({
            where: { id: participant.bill.creatorId },
            select: { tonWalletAddress: true },
          });

          if (userProfile?.tonWalletAddress) {
            console.log(
              "✅ Found wallet address in user profile:",
              userProfile.tonWalletAddress
            );
            // Обновляем адрес кошелька в счете для будущих запросов
            await prisma.bill.update({
              where: { id: participant.bill.id },
              data: {
                creator: {
                  update: {
                    tonWalletAddress: userProfile.tonWalletAddress,
                  },
                },
              },
            });
            // Используем найденный адрес
            creatorWalletAddress = userProfile.tonWalletAddress;
          } else {
            console.log("❌ No wallet address found in user profile either");
            console.log(
              "💡 Suggestion: Creator should connect their TON wallet first"
            );
            return reply.status(400).send({
              error:
                "Creator wallet address not found. Please connect your TON wallet first.",
              details:
                "The creator of this bill needs to connect their TON wallet to receive payments.",
            });
          }
        }

        // Создаем платеж
        console.log("💳 Creating payment...");
        console.log("Payment data:", {
          billId,
          participantId: participant.id,
          provider: participant.bill.currency,
          amount: participant.shareAmount.toString(),
          creatorWalletAddress,
        });

        try {
          console.log("🔗 Generating deeplink...");
          const deeplink = generatePaymentDeeplink(
            participant.bill.currency,
            participant.shareAmount,
            billId, // Передаем billId для включения в комментарий
            creatorWalletAddress || undefined // Передаем адрес кошелька создателя
          );
          console.log("Generated deeplink:", deeplink);

          const payment = await prisma.payment.create({
            data: {
              billId,
              participantId: participant.id,
              provider: participant.bill.currency,
              status: "created",
              amount: participant.shareAmount,
              deeplink,
              externalId: generateExternalId(),
            },
          });

          console.log("✅ Payment created:", {
            id: payment.id,
            provider: payment.provider,
            status: payment.status,
            amount: payment.amount.toString(),
          });

          // Обновляем статус участника
          console.log("📝 Updating participant status...");
          await prisma.billParticipant.update({
            where: { id: participant.id },
            data: {
              paymentId: payment.id,
              paymentStatus: "pending",
            },
          });

          const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

          const response: PaymentIntentResponse = {
            paymentId: payment.id,
            provider: payment.provider,
            deeplink: payment.deeplink!,
            expiresAt: expiresAt.toISOString(),
          };

          console.log("✅ Payment intent response:", response);
          console.log("=== PAYMENT INTENT REQUEST END ===");

          return reply.status(201).send(response);
        } catch (deeplinkError) {
          console.error("❌ Error generating deeplink:", deeplinkError);
          return reply
            .status(400)
            .send({ error: "Failed to generate payment link" });
        }
      } catch (error) {
        console.error("Error creating payment intent:", error);
        return reply
          .status(500)
          .send({ error: "Failed to create payment intent" });
      }
    }
  );

  // Webhook для обновления статуса платежа
  fastify.post<{
    Params: { provider: string };
    Body: PaymentWebhookRequest;
  }>("/api/payments/webhook/:provider", async (request, reply) => {
    try {
      const { provider } = request.params;
      const { externalId, status } = request.body;

      if (!["TON", "USDT"].includes(provider)) {
        return reply.status(400).send({ error: "Invalid provider" });
      }

      if (!["pending", "confirmed", "failed"].includes(status)) {
        return reply.status(400).send({ error: "Invalid status" });
      }

      // Найти платеж по externalId
      const payment = await prisma.payment.findFirst({
        where: {
          externalId,
          provider,
        },
        include: {
          bill: {
            include: {
              participants: true,
            },
          },
        },
      });

      if (!payment) {
        return reply.status(404).send({ error: "Payment not found" });
      }

      // Обновляем статус платежа
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status },
      });

      // Обновляем статус участника
      const participantStatus =
        status === "confirmed"
          ? "paid"
          : status === "failed"
          ? "failed"
          : "pending";

      await prisma.billParticipant.update({
        where: { id: payment.participantId },
        data: { paymentStatus: participantStatus },
      });

      // Отправляем WebSocket уведомление
      if (fastify.websocketServer) {
        const message = {
          type: "payment.updated",
          data: {
            paymentId: payment.id,
            billId: payment.billId,
            status,
            participantId: payment.participantId,
          },
        };

        fastify.websocketServer.clients.forEach(client => {
          if (client.room === `bill_${payment.billId}`) {
            client.send(JSON.stringify(message));
          }
        });
      }

      const response: PaymentWebhookResponse = {
        success: true,
        message: "Payment status updated successfully",
      };

      return reply.send(response);
    } catch (error) {
      console.error("Error processing payment webhook:", error);
      return reply.status(500).send({ error: "Failed to process webhook" });
    }
  });

  // Ручная проверка статуса платежа в блокчейне
  fastify.post<{ Params: { paymentId: string } }>(
    "/api/payments/:paymentId/check",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { paymentId } = request.params;
        const userId = request.user!.id;

        // Проверяем, что пользователь имеет доступ к этому платежу
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: {
            participant: true,
            bill: true,
          },
        });

        if (!payment) {
          return reply.status(404).send({ error: "Payment not found" });
        }

        // Проверяем права доступа
        const hasAccess =
          payment.participant.userId === userId ||
          payment.participant.telegramUserId === userId.toString() ||
          payment.bill.creatorId === userId;

        if (!hasAccess) {
          return reply.status(403).send({ error: "Access denied" });
        }

        // Проверяем статус в блокчейне
        const isConfirmed =
          await tonBlockchainService.checkAndUpdatePaymentStatus(paymentId);

        if (isConfirmed) {
          return reply.send({
            success: true,
            message: "Payment confirmed in blockchain",
            status: "confirmed",
          });
        } else {
          return reply.send({
            success: false,
            message: "Payment not found in blockchain",
            status: payment.status,
          });
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        return reply
          .status(500)
          .send({ error: "Failed to check payment status" });
      }
    }
  );

  // Получение информации о платеже
  fastify.get<{ Params: { paymentId: string } }>(
    "/api/payments/:paymentId",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { paymentId } = request.params;
        const userId = request.user!.id;

        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: {
            participant: {
              include: {
                user: true,
              },
            },
            bill: true,
          },
        });

        if (!payment) {
          return reply.status(404).send({ error: "Payment not found" });
        }

        // Проверяем права доступа
        const hasAccess =
          payment.participant.userId === userId ||
          payment.participant.telegramUserId === userId.toString() ||
          payment.bill.creatorId === userId;

        if (!hasAccess) {
          return reply.status(403).send({ error: "Access denied" });
        }

        return reply.send({
          success: true,
          data: {
            id: payment.id,
            billId: payment.billId,
            amount: payment.amount.toString(),
            currency: payment.provider,
            status: payment.status,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            deeplink: payment.deeplink,
            participant: {
              id: payment.participant.id,
              name: payment.participant.name,
              shareAmount: payment.participant.shareAmount.toString(),
            },
            bill: {
              id: payment.bill.id,
              title: payment.bill.title,
              totalAmount: payment.bill.totalAmount.toString(),
            },
          },
        });
      } catch (error) {
        console.error("Error getting payment info:", error);
        return reply.status(500).send({ error: "Failed to get payment info" });
      }
    }
  );

  // Очистка конкретного платежа (для отладки)
  fastify.delete("/api/payments/:paymentId", async (request, reply) => {
    try {
      const { paymentId } = request.params as { paymentId: string };

      console.log(`🧹 Очищаем платеж ${paymentId}...`);

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          participant: true,
        },
      });

      if (!payment) {
        console.log(`❌ Платеж ${paymentId} не найден`);
        return reply.status(404).send({
          success: false,
          error: "Платеж не найден",
        });
      }

      console.log(`📋 Найден платеж:`, {
        id: payment.id,
        status: payment.status,
        amount: payment.amount.toString(),
        participant: payment.participant.name,
        createdAt: payment.createdAt,
      });

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

      console.log(`✅ Платеж ${paymentId} успешно удален`);

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

// Вспомогательные функции для генерации платежных данных
function generatePaymentDeeplink(
  provider: string,
  amount: Decimal,
  billId?: string,
  creatorWalletAddress?: string
): string {
  if (provider === "TON") {
    // Для TON используем улучшенную функцию создания DeepLink
    if (!creatorWalletAddress) {
      throw new Error("Creator wallet address is required for TON payments");
    }

    const amountInNanoTON = amount.mul(1000000000); // Конвертируем в nanoTON

    // Включаем bill ID в комментарий для отслеживания
    const comment = billId
      ? `Split Bill Payment - bill_${billId}`
      : "Split Bill Payment";

    return createTonPaymentDeeplink(
      creatorWalletAddress,
      amountInNanoTON.toString(),
      comment
    );
  } else if (provider === "USDT") {
    // USDT в TON сети тоже использует TON кошелек
    if (!creatorWalletAddress) {
      throw new Error("Creator wallet address is required for USDT payments");
    }

    const amountInNanoTON = amount.mul(1000000000); // Конвертируем в nanoTON

    // Включаем bill ID в комментарий для отслеживания
    const comment = billId
      ? `Split Bill Payment (USDT) - bill_${billId}`
      : "Split Bill Payment (USDT)";

    return createTonPaymentDeeplink(
      creatorWalletAddress,
      amountInNanoTON.toString(),
      comment
    );
  }

  // Fallback для неизвестных провайдеров
  throw new Error(`Unsupported payment provider: ${provider}`);
}

function generateExternalId(): string {
  return `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
