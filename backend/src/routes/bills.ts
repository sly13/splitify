import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import {
  CreateBillRequest,
  CreateBillResponse,
  BillDetailsResponse,
} from "../types";
import Decimal from "decimal.js";

export async function billsRoutes(fastify: FastifyInstance) {
  // Получение списка счетов пользователя
  fastify.get(
    "/api/bills",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;

        // Получаем счета, где пользователь является создателем или участником
        const bills = await prisma.bill.findMany({
          where: {
            OR: [
              { creatorId: userId }, // Счета, созданные пользователем
              {
                participants: {
                  some: { userId: userId }, // Счета, где пользователь участвует
                },
              },
            ],
          },
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                username: true,
              },
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    username: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        const response = bills.map(bill => ({
          id: bill.id,
          title: bill.title,
          currency: bill.currency,
          totalAmount: bill.totalAmount.toString(),
          splitType: bill.splitType,
          status: bill.status,
          createdAt: bill.createdAt.toISOString(),
          updatedAt: bill.updatedAt.toISOString(),
          creator: bill.creator,
          participants: bill.participants.map(p => ({
            id: p.id,
            name: p.name,
            shareAmount: p.shareAmount.toString(),
            paymentStatus: p.paymentStatus,
            user: p.user,
          })),
          isCreator: bill.creatorId === userId,
        }));

        return reply.send({ bills: response });
      } catch (error) {
        console.error("Error fetching bills:", error);
        return reply.status(500).send({ error: "Failed to fetch bills" });
      }
    }
  );

  // Создание нового счета
  fastify.post<{ Body: CreateBillRequest }>(
    "/api/bills",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { title, totalAmount, currency, splitType, participants } =
          request.body;
        const creatorId = request.user!.id;

        const billTotal = new Decimal(totalAmount);

        // Автоматическое разделение для типа "equal"
        let processedParticipants = participants;
        if (splitType === "equal") {
          const participantCount = participants.length;
          const equalShare = billTotal.div(participantCount);

          processedParticipants = participants.map(participant => ({
            ...participant,
            shareAmount: equalShare.toString(),
          }));
        }

        // Проверяем, что сумма долей равна общей сумме
        const totalShares = processedParticipants.reduce((sum, p) => {
          return sum.add(new Decimal(p.shareAmount));
        }, new Decimal(0));

        if (!totalShares.equals(billTotal)) {
          return reply.status(400).send({
            error: "Sum of participant shares must equal total amount",
          });
        }

        // Создаем счет и участников в транзакции
        const result = await prisma.$transaction(async tx => {
          const bill = await tx.bill.create({
            data: {
              title,
              currency,
              totalAmount: billTotal,
              splitType,
              creatorId,
              status: "open",
            },
          });

          const billParticipants = await Promise.all(
            processedParticipants.map(async participant => {
              // Найти пользователя по telegramUserId или telegramUsername
              let userId = null;
              let telegramUserId = participant.telegramUserId || "";
              let telegramUsername = participant.telegramUsername || "";

              if (participant.telegramUserId) {
                const user = await tx.user.findUnique({
                  where: { telegramUserId: participant.telegramUserId },
                });
                userId = user?.id || null;
              } else if (participant.telegramUsername) {
                // Ищем пользователя по username
                const user = await tx.user.findFirst({
                  where: { username: participant.telegramUsername },
                });
                userId = user?.id || null;
                telegramUserId = user?.telegramUserId || "";
              }

              // Автоматически создаем друга, если указан username
              if (participant.telegramUsername && participant.name) {
                const cleanUsername = participant.telegramUsername.replace(
                  "@",
                  ""
                );

                // Проверяем, существует ли уже такой друг
                const existingFriend = await tx.friend.findFirst({
                  where: {
                    ownerId: creatorId,
                    telegramUsername: cleanUsername,
                  },
                });

                // Если друг не существует, создаем его
                if (!existingFriend) {
                  await tx.friend.create({
                    data: {
                      ownerId: creatorId,
                      name: participant.name,
                      telegramUsername: cleanUsername,
                    },
                  });
                }
              }

              return tx.billParticipant.create({
                data: {
                  billId: bill.id,
                  userId,
                  telegramUserId,
                  telegramUsername,
                  name: participant.name,
                  shareAmount: new Decimal(participant.shareAmount),
                  paymentStatus: "pending",
                },
              });
            })
          );

          return { bill, participants: billParticipants };
        });

        const shareUrl = `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }?startapp=bill_${result.bill.id}`;

        const response: CreateBillResponse = {
          id: result.bill.id,
          shareUrl,
        };

        return reply.status(201).send(response);
      } catch (error) {
        console.error("Error creating bill:", error);
        return reply.status(500).send({ error: "Failed to create bill" });
      }
    }
  );

  // Получение деталей счета
  fastify.get<{ Params: { id: string } }>(
    "/api/bills/:id",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const bill = await prisma.bill.findUnique({
          where: { id },
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                username: true,
              },
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    username: true,
                  },
                },
              },
            },
          },
        });

        if (!bill) {
          return reply.status(404).send({ error: "Bill not found" });
        }

        // Вычисляем агрегаты
        const summary = bill.participants.reduce(
          (acc, participant) => {
            if (participant.paymentStatus === "paid") {
              acc.totalPaid = acc.totalPaid.add(participant.shareAmount);
              acc.paidCount++;
            } else {
              acc.totalPending = acc.totalPending.add(participant.shareAmount);
            }
            acc.totalCount++;
            return acc;
          },
          {
            totalPaid: new Decimal(0),
            totalPending: new Decimal(0),
            paidCount: 0,
            totalCount: 0,
          }
        );

        const response: BillDetailsResponse = {
          id: bill.id,
          title: bill.title,
          currency: bill.currency,
          totalAmount: bill.totalAmount.toString(),
          splitType: bill.splitType,
          status: bill.status,
          createdAt: bill.createdAt.toISOString(),
          updatedAt: bill.updatedAt.toISOString(),
          creator: bill.creator,
          participants: bill.participants.map(p => ({
            id: p.id,
            name: p.name,
            shareAmount: p.shareAmount.toString(),
            paymentStatus: p.paymentStatus,
            user: p.user,
          })),
          summary: {
            totalPaid: summary.totalPaid.toString(),
            totalPending: summary.totalPending.toString(),
            paidCount: summary.paidCount,
            totalCount: summary.totalCount,
          },
        };

        return reply.send(response);
      } catch (error) {
        console.error("Error fetching bill:", error);
        return reply.status(500).send({ error: "Failed to fetch bill" });
      }
    }
  );

  // Закрытие счета
  fastify.post<{ Params: { id: string } }>(
    "/api/bills/:id/close",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user!.id;

        const bill = await prisma.bill.findUnique({
          where: { id },
          include: {
            participants: true,
          },
        });

        if (!bill) {
          return reply.status(404).send({ error: "Bill not found" });
        }

        if (bill.creatorId !== userId) {
          return reply
            .status(403)
            .send({ error: "Only bill creator can close the bill" });
        }

        if (bill.status === "closed") {
          return reply.status(400).send({ error: "Bill is already closed" });
        }

        // Проверяем, что все участники оплатили
        const unpaidParticipants = bill.participants.filter(
          p => p.paymentStatus !== "paid"
        );
        if (unpaidParticipants.length > 0) {
          return reply.status(400).send({
            error: "Cannot close bill with unpaid participants",
          });
        }

        await prisma.bill.update({
          where: { id },
          data: { status: "closed" },
        });

        return reply.send({ success: true });
      } catch (error) {
        console.error("Error closing bill:", error);
        return reply.status(500).send({ error: "Failed to close bill" });
      }
    }
  );
}
