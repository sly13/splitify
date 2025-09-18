import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import { z } from "zod";

// Схемы валидации
const CreateFriendSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  telegramUsername: z.string().optional(),
});

const UpdateFriendSchema = z.object({
  name: z.string().min(1, "Имя обязательно").optional(),
  telegramUsername: z.string().optional(),
});

export async function friendsRoutes(fastify: FastifyInstance) {
  // Получение списка друзей пользователя
  fastify.get(
    "/api/friends",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;

        const friends = await prisma.friend.findMany({
          where: { ownerId: userId },
          orderBy: { createdAt: "desc" },
        });

        return reply.send({ friends });
      } catch (error) {
        console.error("Error fetching friends:", error);
        return reply.status(500).send({ error: "Failed to fetch friends" });
      }
    }
  );

  // Добавление нового друга
  fastify.post(
    "/api/friends",
    {
      preHandler: [fastify.authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1 },
            telegramUsername: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const { name, telegramUsername } = request.body as {
          name: string;
          telegramUsername?: string;
        };

        // Проверяем уникальность username в рамках пользователя
        if (telegramUsername) {
          const existingFriend = await prisma.friend.findFirst({
            where: {
              ownerId: userId,
              telegramUsername: telegramUsername,
            },
          });

          if (existingFriend) {
            return reply.status(400).send({
              error: "Друг с таким username уже существует",
            });
          }
        }

        const friend = await prisma.friend.create({
          data: {
            ownerId: userId,
            name,
            telegramUsername,
          },
        });

        return reply.status(201).send({ friend });
      } catch (error) {
        console.error("Error creating friend:", error);
        return reply.status(500).send({ error: "Failed to create friend" });
      }
    }
  );

  // Обновление друга
  fastify.put(
    "/api/friends/:id",
    {
      preHandler: [fastify.authMiddleware],
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1 },
            telegramUsername: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const { id } = request.params as { id: string };
        const updateData = request.body as {
          name?: string;
          telegramUsername?: string;
        };

        // Проверяем, что друг принадлежит пользователю
        const existingFriend = await prisma.friend.findFirst({
          where: {
            id,
            ownerId: userId,
          },
        });

        if (!existingFriend) {
          return reply.status(404).send({ error: "Друг не найден" });
        }

        // Проверяем уникальность username если он изменился
        if (
          updateData.telegramUsername &&
          updateData.telegramUsername !== existingFriend.telegramUsername
        ) {
          const duplicateFriend = await prisma.friend.findFirst({
            where: {
              ownerId: userId,
              telegramUsername: updateData.telegramUsername,
              id: { not: id },
            },
          });

          if (duplicateFriend) {
            return reply.status(400).send({
              error: "Друг с таким username уже существует",
            });
          }
        }

        const friend = await prisma.friend.update({
          where: { id },
          data: updateData,
        });

        return reply.send({ friend });
      } catch (error) {
        console.error("Error updating friend:", error);
        return reply.status(500).send({ error: "Failed to update friend" });
      }
    }
  );

  // Удаление друга
  fastify.delete(
    "/api/friends/:id",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const { id } = request.params as { id: string };

        // Проверяем, что друг принадлежит пользователю
        const existingFriend = await prisma.friend.findFirst({
          where: {
            id,
            ownerId: userId,
          },
        });

        if (!existingFriend) {
          return reply.status(404).send({ error: "Друг не найден" });
        }

        await prisma.friend.delete({
          where: { id },
        });

        return reply.status(204).send();
      } catch (error) {
        console.error("Error deleting friend:", error);
        return reply.status(500).send({ error: "Failed to delete friend" });
      }
    }
  );

  // Поиск пользователя по username для привязки к другу
  fastify.get(
    "/api/friends/search/:username",
    {
      preHandler: [fastify.authMiddleware],
    },
    async (request, reply) => {
      try {
        const { username } = request.params as { username: string };

        // Убираем @ если есть
        const cleanUsername = username.startsWith("@")
          ? username.slice(1)
          : username;

        const user = await prisma.user.findFirst({
          where: {
            username: cleanUsername,
          },
          select: {
            id: true,
            username: true,
            firstName: true,
            telegramUserId: true,
          },
        });

        return reply.send({ user });
      } catch (error) {
        console.error("Error searching user:", error);
        return reply.status(500).send({ error: "Failed to search user" });
      }
    }
  );

  // Тестовый эндпоинт для получения друзей (без аутентификации)
  fastify.get("/api/friends/test", async (request, reply) => {
    try {
      // В тестовом режиме возвращаем друзей тестового пользователя
      const testUser = await prisma.user.findUnique({
        where: {
          telegramUserId: "123456789",
        },
      });

      if (!testUser) {
        return reply.status(404).send({ error: "Test user not found" });
      }

      const friends = await prisma.friend.findMany({
        where: {
          ownerId: testUser.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reply.send({ friends });
    } catch (error) {
      console.error("Error fetching test friends:", error);
      return reply.status(500).send({ error: "Failed to fetch test friends" });
    }
  });
}
