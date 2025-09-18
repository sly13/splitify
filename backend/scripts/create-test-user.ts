import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Создаем тестового пользователя
    const testUser = await prisma.user.upsert({
      where: {
        telegramUserId: "123456789", // ID из useTelegram.ts
      },
      update: {},
      create: {
        telegramUserId: "123456789",
        firstName: "Тест",
        username: "test_user",
      },
    });

    console.log("✅ Тестовый пользователь создан:", testUser);

    // Создаем несколько тестовых друзей
    const friends = [
      {
        name: "Алексей",
        telegramUsername: "alexey_crypto",
      },
      {
        name: "Мария",
        telegramUsername: "maria_tg",
      },
      {
        name: "Дмитрий",
        telegramUsername: "dmitry_dev",
      },
    ];

    for (const friendData of friends) {
      const friend = await prisma.friend.upsert({
        where: {
          ownerId_telegramUsername: {
            ownerId: testUser.id,
            telegramUsername: friendData.telegramUsername,
          },
        },
        update: {},
        create: {
          ownerId: testUser.id,
          name: friendData.name,
          telegramUsername: friendData.telegramUsername,
        },
      });

      console.log("✅ Друг создан:", friend);
    }

    // Создаем тестовый счет
    const testBill = await prisma.bill.create({
      data: {
        title: "Тестовый счет",
        totalAmount: 1000,
        currency: "USDT",
        splitType: "equal",
        creatorId: testUser.id,
        status: "open",
        participants: {
          create: [
            {
              userId: testUser.id,
              name: testUser.firstName || "Тест",
              shareAmount: 500,
              paymentStatus: "pending",
            },
            {
              userId: null,
              name: "Алексей",
              telegramUsername: "alexey_crypto",
              shareAmount: 500,
              paymentStatus: "pending",
            },
          ],
        },
      },
      include: {
        participants: true,
      },
    });

    console.log("✅ Тестовый счет создан:", testBill);

    console.log("\n🎉 Тестовые данные созданы успешно!");
    console.log("Теперь фронтенд должен работать с тестовым пользователем.");
  } catch (error) {
    console.error("❌ Ошибка создания тестовых данных:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
