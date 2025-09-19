import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import { authMiddleware } from "../middleware/auth";
import { isValidTonAddress } from "../utils/tonAddress";

export async function usersRoutes(fastify: FastifyInstance) {
  // Эндпоинт для инициализации пользователя (создание если не существует)
  fastify.post("/api/user/init", async (request, reply) => {
    try {
      const testMode = request.headers["x-test-mode"] === "true";

      if (testMode) {
        // В тестовом режиме создаем тестового пользователя
        const testUser = await prisma.user.upsert({
          where: {
            telegramUserId: "123456789",
          },
          update: {},
          create: {
            telegramUserId: "123456789",
            username: "test",
            firstName: "Тест",
          },
        });

        return reply.send({
          success: true,
          data: {
            id: testUser.id,
            firstName: testUser.firstName,
            username: testUser.username,
            telegramUserId: testUser.telegramUserId,
            tonWalletAddress: testUser.tonWalletAddress,
          },
          message: "Тестовый пользователь инициализирован",
        });
      } else {
        // В продакшн режиме используем authMiddleware
        return reply.status(400).send({
          error: "Используйте /api/me для инициализации пользователя",
        });
      }
    } catch (error) {
      console.error("Ошибка при инициализации пользователя:", error);
      return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
    }
  });
  // Тестовый эндпоинт для получения информации о пользователе
  fastify.get("/api/me/test", async (request, reply) => {
    try {
      // Создаем или находим тестового пользователя в базе данных
      const testUser = await prisma.user.upsert({
        where: {
          telegramUserId: "123456789",
        },
        update: {
          // Обновляем данные если они изменились
          username: "test",
          firstName: "Тест",
        },
        create: {
          telegramUserId: "123456789",
          username: "test",
          firstName: "Тест",
        },
      });

      console.log("Test user created/found:", testUser.id);

      return reply.send({
        success: true,
        data: {
          id: testUser.id,
          firstName: testUser.firstName,
          username: testUser.username,
          telegramUserId: testUser.telegramUserId,
          tonWalletAddress: testUser.tonWalletAddress,
        },
      });
    } catch (error) {
      console.error(
        "Ошибка при получении тестовой информации о пользователе:",
        error
      );
      return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Получить информацию о текущем пользователе (краткая версия)
  fastify.get(
    "/api/me",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;

        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.status(404).send({ error: "Пользователь не найден" });
        }

        // Возвращаем только нужные поля
        const userData = {
          id: user.id,
          firstName: user.firstName,
          username: user.username,
          telegramUserId: user.telegramUserId,
          tonWalletAddress: (user as any).tonWalletAddress,
        };

        return reply.send({
          success: true,
          data: userData,
        });
      } catch (error) {
        console.error("Ошибка при получении информации о пользователе:", error);
        return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
      }
    }
  );

  // Получить информацию о текущем пользователе
  fastify.get(
    "/api/user/profile",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;

        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.status(404).send({ error: "Пользователь не найден" });
        }

        return reply.send({
          success: true,
          data: user,
        });
      } catch (error) {
        console.error("Ошибка при получении профиля пользователя:", error);
        return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
      }
    }
  );

  // Обновить профиль пользователя
  fastify.put(
    "/api/user/profile",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          properties: {
            tonWalletAddress: { type: "string", nullable: true },
            username: { type: "string", nullable: true },
            firstName: { type: "string", nullable: true },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const { tonWalletAddress, username, firstName } = request.body as any;

        // Валидация адреса кошелька TON (базовая проверка)
        if (tonWalletAddress && !isValidTonAddress(tonWalletAddress)) {
          return reply.status(400).send({
            error: "Некорректный адрес кошелька TON",
          });
        }

        const updateData: any = {};

        if (tonWalletAddress !== undefined) {
          updateData.tonWalletAddress = tonWalletAddress;
        }

        if (username !== undefined) {
          updateData.username = username;
        }

        if (firstName !== undefined) {
          updateData.firstName = firstName;
        }

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData,
        });

        return reply.send({
          success: true,
          data: updatedUser,
          message: "Профиль успешно обновлен",
        });
      } catch (error) {
        console.error("Ошибка при обновлении профиля пользователя:", error);
        return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
      }
    }
  );

  // Получить статистику пользователя
  fastify.get(
    "/api/user/stats",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;

        const [billsCreated, billsParticipated, totalPaid] = await Promise.all([
          prisma.bill.count({
            where: { creatorId: userId },
          }),
          prisma.billParticipant.count({
            where: { userId: userId },
          }),
          prisma.billParticipant.aggregate({
            where: {
              userId: userId,
              paymentStatus: "paid",
            },
            _sum: {
              shareAmount: true,
            },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            billsCreated,
            billsParticipated,
            totalPaid: totalPaid._sum.shareAmount?.toString() || "0",
          },
        });
      } catch (error) {
        console.error("Ошибка при получении статистики пользователя:", error);
        return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
      }
    }
  );
}
