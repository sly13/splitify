import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import {
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentWebhookRequest,
  PaymentWebhookResponse,
} from "../types";
import Decimal from "decimal.js";

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

        // Найти участника для текущего пользователя
        const participant = await prisma.billParticipant.findFirst({
          where: {
            billId,
            OR: [{ userId }, { telegramUserId }],
          },
          include: {
            bill: true,
          },
        });

        if (!participant) {
          return reply.status(404).send({ error: "Participant not found" });
        }

        if (participant.paymentStatus === "paid") {
          return reply.status(400).send({ error: "Payment already completed" });
        }

        // Проверяем, есть ли уже активный платеж
        const existingPayment = await prisma.payment.findFirst({
          where: {
            participantId: participant.id,
            status: { in: ["created", "pending"] },
          },
        });

        if (existingPayment) {
          return reply
            .status(400)
            .send({ error: "Payment already in progress" });
        }

        // Создаем платеж
        const payment = await prisma.payment.create({
          data: {
            billId,
            participantId: participant.id,
            provider: participant.bill.currency,
            status: "created",
            amount: participant.shareAmount,
            deeplink: generatePaymentDeeplink(
              participant.bill.currency,
              participant.shareAmount
            ),
            externalId: generateExternalId(),
          },
        });

        // Обновляем статус участника
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

        return reply.status(201).send(response);
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
}

// Вспомогательные функции для генерации платежных данных
function generatePaymentDeeplink(provider: string, amount: Decimal): string {
  const baseUrls = {
    TON: process.env.TON_PROVIDER_URL || "https://mock-ton-provider.com",
    USDT: process.env.USDT_PROVIDER_URL || "https://mock-usdt-provider.com",
  };

  const url = baseUrls[provider as keyof typeof baseUrls];
  return `${url}/pay?amount=${amount.toString()}&currency=${provider}`;
}

function generateExternalId(): string {
  return `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
