import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testFriendsIntegration() {
  try {
    console.log("🧪 Тестируем интеграцию системы друзей...");

    // Создаем тестового пользователя
    const testUser = await prisma.user.upsert({
      where: { telegramUserId: "123456789" },
      update: {},
      create: {
        telegramUserId: "123456789",
        username: "testuser",
        firstName: "Test",
      },
    });

    console.log("✅ Пользователь создан:", testUser.id);

    // Создаем счет с участниками, которые должны автоматически стать друзьями
    const bill = await prisma.bill.create({
      data: {
        title: "Ужин в ресторане",
        currency: "USDT",
        totalAmount: 150,
        splitType: "equal",
        creatorId: testUser.id,
        status: "open",
      },
    });

    console.log("✅ Счет создан:", bill.id);

    // Создаем участников счета (имитируем создание через API)
    const participants = [
      {
        name: "Алексей",
        telegramUsername: "alexey_crypto",
        shareAmount: 50,
      },
      {
        name: "Мария",
        telegramUsername: "maria_tg",
        shareAmount: 50,
      },
      {
        name: "Дмитрий",
        telegramUsername: "dmitry_dev",
        shareAmount: 50,
      },
    ];

    // Создаем участников и автоматически добавляем их в друзья
    for (const participant of participants) {
      // Проверяем, существует ли уже такой друг
      const existingFriend = await prisma.friend.findFirst({
        where: {
          ownerId: testUser.id,
          telegramUsername: participant.telegramUsername,
        },
      });

      // Если друг не существует, создаем его
      if (!existingFriend) {
        await prisma.friend.create({
          data: {
            ownerId: testUser.id,
            name: participant.name,
            telegramUsername: participant.telegramUsername,
          },
        });
        console.log(
          `✅ Друг ${participant.name} (@${participant.telegramUsername}) добавлен`
        );
      } else {
        console.log(`ℹ️ Друг ${participant.name} уже существует`);
      }

      // Создаем участника счета
      await prisma.billParticipant.create({
        data: {
          billId: bill.id,
          userId: null, // пока не зарегистрирован
          telegramUsername: participant.telegramUsername,
          name: participant.name,
          shareAmount: participant.shareAmount,
          paymentStatus: "pending",
        },
      });
    }

    console.log("✅ Участники счета созданы");

    // Проверяем список друзей пользователя
    const friends = await prisma.friend.findMany({
      where: { ownerId: testUser.id },
      orderBy: { createdAt: "desc" },
    });

    console.log("\n📋 Список друзей пользователя:");
    friends.forEach(friend => {
      console.log(
        `- ${friend.name} (@${
          friend.telegramUsername
        }) - добавлен ${friend.createdAt.toLocaleDateString()}`
      );
    });

    // Создаем второй счет с теми же друзьями
    const bill2 = await prisma.bill.create({
      data: {
        title: "Покупки в магазине",
        currency: "USDT",
        totalAmount: 75,
        splitType: "equal",
        creatorId: testUser.id,
        status: "open",
      },
    });

    console.log("\n✅ Второй счет создан:", bill2.id);

    // Добавляем участников из существующих друзей
    const existingFriends = await prisma.friend.findMany({
      where: { ownerId: testUser.id },
      take: 2, // Берем только первых двух друзей
    });

    for (const friend of existingFriends) {
      await prisma.billParticipant.create({
        data: {
          billId: bill2.id,
          userId: null,
          telegramUsername: friend.telegramUsername,
          name: friend.name,
          shareAmount: 37.5, // 75 / 2
          paymentStatus: "pending",
        },
      });
    }

    console.log("✅ Участники второго счета добавлены из существующих друзей");

    // Проверяем итоговую статистику
    const totalFriends = await prisma.friend.count({
      where: { ownerId: testUser.id },
    });

    const totalBills = await prisma.bill.count({
      where: { creatorId: testUser.id },
    });

    const totalParticipants = await prisma.billParticipant.count({
      where: {
        bill: { creatorId: testUser.id },
      },
    });

    console.log("\n📊 Итоговая статистика:");
    console.log(`- Всего друзей: ${totalFriends}`);
    console.log(`- Всего счетов: ${totalBills}`);
    console.log(`- Всего участников: ${totalParticipants}`);

    console.log("\n🎉 Тест интеграции завершен успешно!");
  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFriendsIntegration();
