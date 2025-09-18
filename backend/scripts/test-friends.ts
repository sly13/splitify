import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testFriendsSystem() {
  try {
    console.log("🧪 Тестируем систему друзей...");

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

    // Создаем друзей
    const friend1 = await prisma.friend.create({
      data: {
        ownerId: testUser.id,
        name: "Алексей",
        telegramUsername: "alexey_crypto",
      },
    });

    const friend2 = await prisma.friend.create({
      data: {
        ownerId: testUser.id,
        name: "Мария",
        telegramUsername: "maria_tg",
      },
    });

    console.log("✅ Друзья созданы:", {
      friend1: friend1.id,
      friend2: friend2.id,
    });

    // Создаем счет с участием друзей
    const bill = await prisma.bill.create({
      data: {
        title: "Ужин в ресторане",
        currency: "USDT",
        totalAmount: 100,
        splitType: "equal",
        creatorId: testUser.id,
        status: "open",
      },
    });

    console.log("✅ Счет создан:", bill.id);

    // Создаем участников счета
    const participant1 = await prisma.billParticipant.create({
      data: {
        billId: bill.id,
        userId: null, // пока не зарегистрирован
        telegramUsername: "alexey_crypto",
        name: "Алексей",
        shareAmount: 33.33,
        paymentStatus: "pending",
      },
    });

    const participant2 = await prisma.billParticipant.create({
      data: {
        billId: bill.id,
        userId: null, // пока не зарегистрирован
        telegramUsername: "maria_tg",
        name: "Мария",
        shareAmount: 33.33,
        paymentStatus: "pending",
      },
    });

    const participant3 = await prisma.billParticipant.create({
      data: {
        billId: bill.id,
        userId: testUser.id, // создатель счета
        telegramUserId: testUser.telegramUserId,
        name: "Test User",
        shareAmount: 33.34,
        paymentStatus: "pending",
      },
    });

    console.log("✅ Участники созданы:", {
      participant1: participant1.id,
      participant2: participant2.id,
      participant3: participant3.id,
    });

    // Симулируем регистрацию пользователя "Алексей"
    const alexeyUser = await prisma.user.create({
      data: {
        telegramUserId: "987654321",
        username: "alexey_crypto",
        firstName: "Алексей",
      },
    });

    console.log("✅ Алексей зарегистрировался:", alexeyUser.id);

    // Привязываем Алексея к счету
    await prisma.billParticipant.update({
      where: { id: participant1.id },
      data: { userId: alexeyUser.id },
    });

    console.log("✅ Алексей привязан к счету");

    // Проверяем результат
    const finalBill = await prisma.bill.findUnique({
      where: { id: bill.id },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        creator: true,
      },
    });

    console.log("\n📋 Итоговый счет:");
    console.log("Название:", finalBill?.title);
    console.log("Создатель:", finalBill?.creator.firstName);
    console.log("Участники:");
    finalBill?.participants.forEach(p => {
      console.log(
        `- ${p.name}: ${p.shareAmount} ${finalBill.currency} (${p.paymentStatus})`
      );
      if (p.user) {
        console.log(
          `  Привязан к пользователю: ${p.user.firstName} (@${p.user.username})`
        );
      } else {
        console.log(`  Не зарегистрирован в системе`);
      }
    });

    console.log("\n🎉 Тест завершен успешно!");
  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFriendsSystem();
