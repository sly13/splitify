import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAutomaticFriendCreation() {
  try {
    console.log("🧪 Тестируем автоматическое создание друзей...");

    // Создаем тестового пользователя
    const testUser = await prisma.user.upsert({
      where: { telegramUserId: "test_user_123" },
      update: {},
      create: {
        telegramUserId: "test_user_123",
        username: "testuser",
        firstName: "Test",
      },
    });

    console.log("✅ Тестовый пользователь создан:", testUser.id);

    // Создаем счет с участниками, которые должны стать друзьями
    const bill = await prisma.bill.create({
      data: {
        title: "Тестовый счет для проверки друзей",
        currency: "USDT",
        totalAmount: 100,
        splitType: "equal",
        creatorId: testUser.id,
        status: "open",
      },
    });

    console.log("✅ Счет создан:", bill.id);

    // Симулируем создание участников (как это делает API)
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
    ];

    // Создаем участников и автоматически добавляем их в друзья
    for (const participant of participants) {
      console.log(
        `\n🔍 Обрабатываем участника: ${participant.name} (@${participant.telegramUsername})`
      );

      // Проверяем, существует ли уже такой друг
      const existingFriend = await prisma.friend.findFirst({
        where: {
          ownerId: testUser.id,
          telegramUsername: participant.telegramUsername,
        },
      });

      // Если друг не существует, создаем его
      if (!existingFriend) {
        console.log(
          `✅ Создаем нового друга: ${participant.name} (@${participant.telegramUsername})`
        );
        await prisma.friend.create({
          data: {
            ownerId: testUser.id,
            name: participant.name,
            telegramUsername: participant.telegramUsername,
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

      // Создаем участника счета
      await prisma.billParticipant.create({
        data: {
          billId: bill.id,
          userId: null,
          telegramUsername: participant.telegramUsername,
          name: participant.name,
          shareAmount: participant.shareAmount,
          paymentStatus: "pending",
        },
      });
    }

    console.log("\n✅ Участники счета созданы");

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

    // Тестируем повторное создание счета с теми же участниками
    console.log("\n🔄 Тестируем повторное создание счета...");

    const bill2 = await prisma.bill.create({
      data: {
        title: "Второй тестовый счет",
        currency: "USDT",
        totalAmount: 200,
        splitType: "equal",
        creatorId: testUser.id,
        status: "open",
      },
    });

    // Создаем участников снова (друзья не должны дублироваться)
    for (const participant of participants) {
      const existingFriend = await prisma.friend.findFirst({
        where: {
          ownerId: testUser.id,
          telegramUsername: participant.telegramUsername,
        },
      });

      if (!existingFriend) {
        await prisma.friend.create({
          data: {
            ownerId: testUser.id,
            name: participant.name,
            telegramUsername: participant.telegramUsername,
          },
        });
        console.log(`✅ Создан новый друг: ${participant.name}`);
      } else {
        console.log(
          `ℹ️ Друг ${participant.name} уже существует (дублирование предотвращено)`
        );
      }

      await prisma.billParticipant.create({
        data: {
          billId: bill2.id,
          userId: null,
          telegramUsername: participant.telegramUsername,
          name: participant.name,
          shareAmount: participant.shareAmount,
          paymentStatus: "pending",
        },
      });
    }

    // Финальная проверка списка друзей
    const finalFriends = await prisma.friend.findMany({
      where: { ownerId: testUser.id },
      orderBy: { createdAt: "desc" },
    });

    console.log("\n📋 Финальный список друзей:");
    finalFriends.forEach(friend => {
      console.log(
        `- ${friend.name} (@${
          friend.telegramUsername
        }) - добавлен ${friend.createdAt.toLocaleDateString()}`
      );
    });

    console.log(`\n🎉 Тест завершен! Всего друзей: ${finalFriends.length}`);
  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutomaticFriendCreation();
