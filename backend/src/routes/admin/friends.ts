import { FastifyInstance } from "fastify";
import { prisma } from "../../config/database";

export async function adminFriendsRoutes(fastify: FastifyInstance) {
  // Получение всех друзей (для админки)
  fastify.get(
    "/api/admin/friends",
    {
      preHandler: [fastify.adminAuthMiddleware],
    },
    async (request, reply) => {
      try {
        const friends = await prisma.friend.findMany({
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return reply.send({ friends });
      } catch (error) {
        console.error("Error fetching friends for admin:", error);
        return reply.status(500).send({ error: "Failed to fetch friends" });
      }
    }
  );

  // Получение статистики друзей
  fastify.get(
    "/api/admin/friends/stats",
    {
      preHandler: [fastify.adminAuthMiddleware],
    },
    async (request, reply) => {
      try {
        const totalFriends = await prisma.friend.count();

        const friendsByOwner = await prisma.friend.groupBy({
          by: ["ownerId"],
          _count: {
            id: true,
          },
        });

        const topOwners = await prisma.friend.groupBy({
          by: ["ownerId"],
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
          take: 10,
        });

        // Получаем информацию о владельцах
        const ownerIds = topOwners.map(item => item.ownerId);
        const owners = await prisma.user.findMany({
          where: {
            id: { in: ownerIds },
          },
          select: {
            id: true,
            firstName: true,
            username: true,
          },
        });

        const topOwnersWithInfo = topOwners.map(item => {
          const owner = owners.find(o => o.id === item.ownerId);
          return {
            ownerId: item.ownerId,
            ownerName: owner?.firstName || owner?.username || "Неизвестно",
            friendsCount: item._count.id,
          };
        });

        const recentFriends = await prisma.friend.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                username: true,
              },
            },
          },
        });

        return reply.send({
          totalFriends,
          friendsByOwner: friendsByOwner.length,
          topOwners: topOwnersWithInfo,
          recentFriends,
        });
      } catch (error) {
        console.error("Error fetching friends stats:", error);
        return reply
          .status(500)
          .send({ error: "Failed to fetch friends stats" });
      }
    }
  );

  // Удаление друга (для админки)
  fastify.delete(
    "/api/admin/friends/:id",
    {
      preHandler: [fastify.adminAuthMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const friend = await prisma.friend.findUnique({
          where: { id },
          include: {
            owner: {
              select: {
                firstName: true,
                username: true,
              },
            },
          },
        });

        if (!friend) {
          return reply.status(404).send({ error: "Друг не найден" });
        }

        await prisma.friend.delete({
          where: { id },
        });

        return reply.send({
          message: "Друг успешно удален",
          deletedFriend: {
            name: friend.name,
            telegramUsername: friend.telegramUsername,
            owner: friend.owner.firstName || friend.owner.username,
          },
        });
      } catch (error) {
        console.error("Error deleting friend:", error);
        return reply.status(500).send({ error: "Failed to delete friend" });
      }
    }
  );
}
