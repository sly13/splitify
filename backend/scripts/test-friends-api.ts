import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testFriendsAPI() {
  try {
    // Находим тестового пользователя
    const testUser = await prisma.user.findUnique({
      where: {
        telegramUserId: "123456789",
      },
      include: {
        friends: true,
      },
    });

    if (!testUser) {
      console.log("❌ Тестовый пользователь не найден");
      return;
    }

    console.log("✅ Тестовый пользователь найден:", testUser);
    console.log("📋 Друзья пользователя:", testUser.friends);

    // Тестируем API друзей напрямую через Prisma
    const friends = await prisma.friend.findMany({
      where: {
        ownerId: testUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("🔍 Результат API друзей:", friends);
  } catch (error) {
    console.error("❌ Ошибка:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFriendsAPI();
