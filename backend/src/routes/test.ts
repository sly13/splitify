import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import { CreateBillRequest, CreateBillResponse } from "../types";
import Decimal from "decimal.js";

export async function testRoutes(fastify: FastifyInstance) {
  // Тестовые эндпоинты только в тестовом режиме
  if (process.env.TEST_MODE !== "true") {
    return;
  }

  // Получение счетов тестового пользователя
  fastify.get("/api/bills/test", async (request, reply) => {
    try {
      // Используем тестового пользователя
      const testUserId = "cmfp9zikh0000c1d5jzjz9uhc"; // ID тестового пользователя "Тест"

      const bills = await prisma.bill.findMany({
        where: {
          OR: [
            { creatorId: testUserId },
            {
              participants: {
                some: { userId: testUserId },
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
        description: bill.description || "",
        currency: bill.currency,
        totalAmount: parseFloat(bill.totalAmount.toString()),
        splitType: bill.splitType,
        status: bill.status === "open" ? "active" : bill.status,
        createdAt: bill.createdAt.toISOString(),
        updatedAt: bill.updatedAt.toISOString(),
        createdBy: bill.creator,
        participants: bill.participants.map(p => ({
          id: p.id,
          user: p.user || {
            id: 123456789, // ID тестового пользователя
            firstName: p.name,
            lastName: "",
            username: "",
            photoUrl: "",
          },
          amount: parseFloat(p.shareAmount.toString()),
          currency: bill.currency,
          status: p.paymentStatus === "paid" ? "paid" : 
                  p.paymentStatus === "pending" ? "pending" : "confirmed",
          joinedAt: bill.createdAt.toISOString(),
        })),
        payments: [], // Пока пустой массив
        isCreator: bill.creatorId === testUserId,
      }));

      return reply.send({ bills: response });
    } catch (error) {
      console.error("Error fetching test bills:", error);
      return reply.status(500).send({ error: "Failed to fetch bills" });
    }
  });

  // Получение информации о тестовом пользователе
  fastify.get("/api/user/test", async (request, reply) => {
    try {
      const testUserId = "cmfp9zikh0000c1d5jzjz9uhc";

      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: {
          id: true,
          telegramUserId: true,
          username: true,
          firstName: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: "Test user not found" });
      }

      return reply.send({ user });
    } catch (error) {
      console.error("Error fetching test user:", error);
      return reply.status(500).send({ error: "Failed to fetch user" });
    }
  });

  // Получение конкретного счета тестовым пользователем
  fastify.get<{ Params: { id: string } }>(
    "/api/bills/test/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const testUserId = "cmfp9zikh0000c1d5jzjz9uhc"; // ID тестового пользователя "Тест"

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

        // Проверяем, что тестовый пользователь имеет доступ к счету
        const hasAccess =
          bill.creatorId === testUserId ||
          bill.participants.some(p => p.userId === testUserId);

        if (!hasAccess) {
          return reply.status(403).send({ error: "Access denied" });
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

      const response = {
        id: bill.id,
        title: bill.title,
        description: bill.description || "",
        currency: bill.currency,
        totalAmount: parseFloat(bill.totalAmount.toString()),
        splitType: bill.splitType,
        status: bill.status === "open" ? "active" : bill.status,
        createdAt: bill.createdAt.toISOString(),
        updatedAt: bill.updatedAt.toISOString(),
        createdBy: bill.creator,
        participants: bill.participants.map(p => ({
          id: p.id,
          user: p.user || {
            id: 123456789, // ID тестового пользователя
            firstName: p.name,
            lastName: "",
            username: "",
            photoUrl: "",
          },
          amount: parseFloat(p.shareAmount.toString()),
          currency: bill.currency,
          status: p.paymentStatus === "paid" ? "paid" : 
                  p.paymentStatus === "pending" ? "pending" : "confirmed",
          joinedAt: bill.createdAt.toISOString(),
        })),
        payments: [], // Пока пустой массив
        summary: {
          totalPaid: summary.totalPaid.toString(),
          totalPending: summary.totalPending.toString(),
          paidCount: summary.paidCount,
          totalCount: summary.totalCount,
        },
        isCreator: bill.creatorId === testUserId,
      };

        return reply.send(response);
      } catch (error) {
        console.error("Error fetching test bill:", error);
        return reply.status(500).send({ error: "Failed to fetch bill" });
      }
    }
  );

  // Создание счета тестовым пользователем
  fastify.post<{ Body: CreateBillRequest }>(
    "/api/bills/test",
    async (request, reply) => {
      try {
        const { title, totalAmount, currency, splitType, participants } =
          request.body;
        const testUserId = "cmfp9zikh0000c1d5jzjz9uhc"; // ID тестового пользователя "Тест"

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
              creatorId: testUserId,
              status: "open",
            },
          });

          const billParticipants = await Promise.all(
            processedParticipants.map(async participant => {
              // Найти пользователя по telegramUserId если указан
              let userId = null;
              if (participant.telegramUserId) {
                const user = await tx.user.findUnique({
                  where: { telegramUserId: participant.telegramUserId },
                });
                userId = user?.id || null;
              }

              return tx.billParticipant.create({
                data: {
                  billId: bill.id,
                  userId,
                  telegramUserId: participant.telegramUserId || "",
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
        console.error("Error creating test bill:", error);
        return reply.status(500).send({ error: "Failed to create bill" });
      }
    }
  );
}
