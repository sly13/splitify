import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import { CreateBillRequest, BillDetailsResponse } from "../types";
import Decimal from "decimal.js";
import { sendTelegramMessage } from "../utils/telegram";

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
            telegramUsername: p.telegramUsername,
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
        const {
          title,
          totalAmount,
          currency,
          splitType,
          participants,
          creatorWalletAddress,
        } = request.body;
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

        // Проверяем, что сумма долей не меньше общей суммы
        const totalShares = processedParticipants.reduce((sum, p) => {
          return sum.add(new Decimal(p.shareAmount));
        }, new Decimal(0));

        // Если сумма долей меньше общей суммы - ошибка
        // Если сумма долей больше общей суммы - это норма (округление)
        if (totalShares.lessThan(billTotal.sub(new Decimal(0.01)))) {
          return reply.status(400).send({
            error: "Sum of participant shares cannot be less than total amount",
          });
        }

        // Создаем счет и участников в транзакции
        const result = await prisma.$transaction(async tx => {
          // Обновляем кошелек пользователя если он предоставлен
          if (creatorWalletAddress) {
            await tx.user.update({
              where: { id: creatorId },
              data: { tonWalletAddress: creatorWalletAddress },
            });
          }

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
              console.log(`🔍 Обрабатываем участника:`, {
                name: participant.name,
                telegramUsername: participant.telegramUsername,
                hasUsername: !!participant.telegramUsername,
                usernameLength: participant.telegramUsername?.length || 0,
              });

              if (
                participant.telegramUsername &&
                participant.telegramUsername.trim() &&
                participant.name
              ) {
                const cleanUsername = participant.telegramUsername.replace(
                  "@",
                  ""
                );

                console.log(
                  `🔍 Проверяем существование друга: ${participant.name} (@${cleanUsername})`
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
                  console.log(
                    `✅ Создаем нового друга: ${participant.name} (@${cleanUsername})`
                  );
                  await tx.friend.create({
                    data: {
                      ownerId: creatorId,
                      name: participant.name,
                      telegramUsername: cleanUsername,
                    },
                  });
                  console.log(
                    `🎉 Друг ${participant.name} успешно добавлен в список друзей!`
                  );
                } else {
                  console.log(
                    `ℹ️ Друг ${participant.name} уже существует в списке друзей`
                  );
                }
              } else {
                console.log(
                  `⚠️ Не удается создать друга: отсутствует имя или username для участника`,
                  {
                    name: participant.name,
                    telegramUsername: participant.telegramUsername,
                  }
                );
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
                  isPayer: participant.isPayer || false,
                },
              });
            })
          );

          return { bill, participants: billParticipants };
        });

        // Получаем созданный счет с полными данными
        const createdBill = await prisma.bill.findUnique({
          where: { id: result.bill.id },
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

        if (!createdBill) {
          return reply
            .status(500)
            .send({ error: "Failed to retrieve created bill" });
        }

        const shareUrl = `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }?startapp=bill_${createdBill.id}`;

        const response = {
          id: createdBill.id,
          title: createdBill.title,
          currency: createdBill.currency,
          totalAmount: createdBill.totalAmount.toString(),
          splitType: createdBill.splitType,
          status: createdBill.status,
          createdAt: createdBill.createdAt.toISOString(),
          updatedAt: createdBill.updatedAt.toISOString(),
          creator: createdBill.creator,
          participants: createdBill.participants.map(p => ({
            id: p.id,
            name: p.name,
            telegramUsername: p.telegramUsername,
            telegramUserId: p.telegramUserId,
            amount: p.shareAmount.toString(),
            status: p.paymentStatus,
            user: p.user,
          })),
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
            isPayer: p.isPayer,
            telegramUsername: p.telegramUsername,
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

  // Отправка ссылки на счет выбранным участникам
  fastify.post<{
    Params: { id: string };
    Body: { participantIds: string[]; shareUrl: string };
  }>(
    "/api/bills/:id/send-to-participants",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { participantIds, shareUrl } = request.body;
        const userId = request.user!.id;

        const bill = await prisma.bill.findUnique({
          where: { id },
          include: {
            participants: {
              include: {
                user: true,
              },
            },
            creator: {
              select: {
                firstName: true,
                username: true,
              },
            },
          },
        });

        if (!bill) {
          return reply.status(404).send({ error: "Bill not found" });
        }

        if (bill.creatorId !== userId) {
          return reply
            .status(403)
            .send({ error: "Only bill creator can send messages" });
        }

        // Получаем выбранных участников с telegramUserId
        const selectedParticipants = bill.participants.filter(
          p =>
            participantIds.includes(p.id) &&
            p.telegramUserId &&
            p.telegramUserId !== userId.toString()
        );

        if (selectedParticipants.length === 0) {
          return reply
            .status(400)
            .send({ error: "No valid participants selected" });
        }

        // Получаем токен бота
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          return reply
            .status(500)
            .send({ error: "Telegram bot token not configured" });
        }

        // Отправляем сообщения через Telegram Bot API
        const message =
          `💰 <b>Новый счет от ${bill.creator.firstName}!</b>\n\n` +
          `📋 <b>Название:</b> ${bill.title}\n` +
          `💵 <b>Сумма:</b> ${bill.totalAmount} ${bill.currency}\n` +
          `👥 <b>Участников:</b> ${bill.participants.length}\n\n` +
          `🔗 <a href="${shareUrl}">Перейти к счету</a>`;

        const sendPromises = selectedParticipants.map(async participant => {
          try {
            console.log(
              `📨 Отправляем сообщение участнику ${participant.name} (${participant.telegramUserId})`
            );

            const result = await sendTelegramMessage(
              participant.telegramUserId!,
              message,
              botToken
            );

            if (result.success) {
              console.log(
                `✅ Сообщение отправлено участнику ${participant.name}`
              );
              return { success: true, participantId: participant.id };
            } else {
              console.error(
                `❌ Ошибка отправки участнику ${participant.name}:`,
                result.error
              );
              return {
                success: false,
                participantId: participant.id,
                error: result.error,
              };
            }
          } catch (error) {
            console.error(
              `❌ Ошибка отправки участнику ${participant.name}:`,
              error
            );
            return { success: false, participantId: participant.id, error };
          }
        });

        const results = await Promise.allSettled(sendPromises);
        const successful = results.filter(
          r => r.status === "fulfilled" && r.value.success
        ).length;
        const failed = results.length - successful;

        return reply.send({
          success: true,
          message: `Отправлено ${successful} из ${results.length} участников`,
          details: {
            total: results.length,
            successful,
            failed,
          },
        });
      } catch (error) {
        console.error("Error sending to all participants:", error);
        return reply.status(500).send({ error: "Failed to send messages" });
      }
    }
  );

  // Отправка ссылки на счет конкретному участнику
  fastify.post<{
    Params: { id: string };
    Body: { participantId: string; telegramUserId: string; appUrl: string };
  }>(
    "/api/bills/:id/send-to-participant",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { participantId, telegramUserId, appUrl } = request.body;
        const userId = request.user!.id;

        const bill = await prisma.bill.findUnique({
          where: { id },
          include: {
            participants: {
              include: {
                user: true,
              },
            },
            creator: {
              select: {
                firstName: true,
                username: true,
              },
            },
          },
        });

        if (!bill) {
          return reply.status(404).send({ error: "Bill not found" });
        }

        if (bill.creatorId !== userId) {
          return reply
            .status(403)
            .send({ error: "Only bill creator can send messages" });
        }

        // Находим участника
        const participant = bill.participants.find(p => p.id === participantId);
        if (!participant) {
          return reply.status(404).send({ error: "Participant not found" });
        }

        if (!participant.telegramUserId) {
          return reply
            .status(400)
            .send({ error: "Participant has no Telegram ID" });
        }

        // Получаем токен бота
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          return reply
            .status(500)
            .send({ error: "Telegram bot token not configured" });
        }

        // Создаем сообщение
        const message =
          `💰 <b>Счет от ${bill.creator.firstName}!</b>\n\n` +
          `📋 <b>Название:</b> ${bill.title}\n` +
          `💵 <b>Ваша доля:</b> ${participant.shareAmount} ${bill.currency}\n` +
          `👥 <b>Всего участников:</b> ${bill.participants.length}\n\n` +
          `🔗 <a href="${appUrl}">Открыть счет в приложении</a>`;

        // Отправляем сообщение
        const result = await sendTelegramMessage(
          participant.telegramUserId,
          message,
          botToken
        );

        if (result.success) {
          console.log(`✅ Сообщение отправлено участнику ${participant.name}`);
          return reply.send({
            success: true,
            message: `Сообщение отправлено ${participant.name}`,
          });
        } else {
          console.error(
            `❌ Ошибка отправки участнику ${participant.name}:`,
            result.error
          );
          return reply.status(500).send({
            error: result.error || "Failed to send message",
          });
        }
      } catch (error) {
        console.error("Error sending to participant:", error);
        return reply.status(500).send({ error: "Failed to send message" });
      }
    }
  );

  // Удаление счета (только если нет транзакций)
  fastify.delete<{ Params: { id: string } }>(
    "/api/bills/:id",
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
            participants: {
              include: {
                user: true,
              },
            },
          },
        });

        if (!bill) {
          return reply.status(404).send({ error: "Bill not found" });
        }

        if (bill.creatorId !== userId) {
          return reply
            .status(403)
            .send({ error: "Only bill creator can delete the bill" });
        }

        // Проверяем, есть ли уже транзакции (платежи)
        const hasPayments = bill.participants.some(
          p => p.paymentStatus === "paid"
        );

        if (hasPayments) {
          return reply.status(400).send({
            error: "Cannot delete bill with existing payments",
          });
        }

        // Удаляем счет и всех участников в транзакции
        await prisma.$transaction(async tx => {
          // Удаляем всех участников
          await tx.billParticipant.deleteMany({
            where: { billId: id },
          });

          // Удаляем счет
          await tx.bill.delete({
            where: { id },
          });
        });

        return reply.send({ success: true });
      } catch (error) {
        console.error("Error deleting bill:", error);
        return reply.status(500).send({ error: "Failed to delete bill" });
      }
    }
  );

  // Отметка участника как плательщика за весь счёт
  fastify.put(
    "/api/bills/:billId/participants/:participantId/payer",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { billId, participantId } = request.params as {
          billId: string;
          participantId: string;
        };
        const { isPayer } = request.body as { isPayer: boolean };
        const userId = request.user!.id;

        // Проверяем, что пользователь является создателем счёта
        const bill = await prisma.bill.findFirst({
          where: {
            id: billId,
            creatorId: userId,
          },
          include: {
            participants: true,
          },
        });

        if (!bill) {
          return reply
            .status(404)
            .send({ error: "Bill not found or access denied" });
        }

        // Проверяем, что участник существует
        const participant = bill.participants.find(p => p.id === participantId);
        if (!participant) {
          return reply.status(404).send({ error: "Participant not found" });
        }

        // Если отмечаем как плательщика, снимаем отметку с других участников
        if (isPayer) {
          await prisma.billParticipant.updateMany({
            where: {
              billId: billId,
              isPayer: true,
            },
            data: {
              isPayer: false,
            },
          });
        }

        // Обновляем статус участника
        const updatedParticipant = await prisma.billParticipant.update({
          where: {
            id: participantId,
          },
          data: {
            isPayer: isPayer,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                username: true,
              },
            },
          },
        });

        return reply.send({
          success: true,
          participant: {
            id: updatedParticipant.id,
            name: updatedParticipant.name,
            shareAmount: updatedParticipant.shareAmount.toString(),
            paymentStatus: updatedParticipant.paymentStatus,
            isPayer: updatedParticipant.isPayer,
            user: updatedParticipant.user,
          },
        });
      } catch (error) {
        console.error("Error updating payer status:", error);
        return reply
          .status(500)
          .send({ error: "Failed to update payer status" });
      }
    }
  );

  // Присоединение к счету по ссылке
  fastify.post<{ Params: { id: string } }>(
    "/api/bills/:id/join",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user!.id;

        // Проверяем, существует ли счет
        const bill = await prisma.bill.findUnique({
          where: { id },
          include: {
            participants: {
              include: {
                user: true,
              },
            },
            creator: true,
          },
        });

        if (!bill) {
          return reply.status(404).send({ error: "Bill not found" });
        }

        // Проверяем, не является ли пользователь создателем
        if (bill.creatorId === userId) {
          return reply
            .status(400)
            .send({ error: "Creator cannot join their own bill" });
        }

        // Проверяем, не является ли пользователь уже участником
        const existingParticipant = bill.participants.find(
          p => p.userId === userId
        );
        if (existingParticipant) {
          return reply.send({
            success: true,
            message: "Already a participant",
            participant: existingParticipant,
          });
        }

        // Получаем информацию о пользователе
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        // Создаем нового участника
        const participant = await prisma.participants.create({
          data: {
            billId: id,
            userId: userId,
            name: user.firstName || user.username || "Unknown",
            telegramUsername: user.username,
            telegramUserId: user.id.toString(),
            shareAmount: 0, // Будет рассчитано позже
            paymentStatus: "pending",
            isPayer: false,
          },
          include: {
            user: true,
          },
        });

        console.log(`✅ User ${user.firstName} joined bill ${bill.title}`);

        return reply.send({
          success: true,
          message: "Successfully joined bill",
          participant: {
            id: participant.id,
            name: participant.name,
            telegramUsername: participant.telegramUsername,
            telegramUserId: participant.telegramUserId,
            shareAmount: participant.shareAmount.toString(),
            paymentStatus: participant.paymentStatus,
            isPayer: participant.isPayer,
            user: participant.user,
          },
        });
      } catch (error) {
        console.error("Error joining bill:", error);
        return reply.status(500).send({ error: "Failed to join bill" });
      }
    }
  );
}
