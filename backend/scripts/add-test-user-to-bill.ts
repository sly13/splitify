import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function addTestUserToBill() {
  try {
    console.log("🔧 Добавляем тестового пользователя к счету...");

    const billId = "cmfqzvmd000035xoj9e574idg";
    const testTelegramUserId = "123456789";

    // Проверяем, существует ли счет
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        participants: true,
        creator: true,
      },
    });

    if (!bill) {
      console.log("❌ Счет не найден");
      return;
    }

    console.log("📄 Информация о счете:");
    console.log(`   ID: ${bill.id}`);
    console.log(`   Название: ${bill.title}`);
    console.log(`   Валюта: ${bill.currency}`);
    console.log(`   Создатель: ${bill.creator.firstName} (${bill.creator.username})`);
    console.log(`   Участников: ${bill.participants.length}`);

    // Проверяем, есть ли уже тестовый пользователь среди участников
    const existingParticipant = bill.participants.find(
      p => p.telegramUserId === testTelegramUserId
    );

    if (existingParticipant) {
      console.log("✅ Тестовый пользователь уже является участником счета");
      console.log(`   Участник: ${existingParticipant.name}`);
      console.log(`   Статус платежа: ${existingParticipant.paymentStatus}`);
      console.log(`   Сумма доли: ${existingParticipant.shareAmount.toString()}`);
      return;
    }

    // Находим или создаем тестового пользователя
    let testUser = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramUserId: testTelegramUserId },
          { username: "test" },
          { firstName: "Тест" },
        ],
      },
    });

    if (!testUser) {
      console.log("👤 Создаем тестового пользователя...");
      testUser = await prisma.user.create({
        data: {
          telegramUserId: testTelegramUserId,
          username: "test",
          firstName: "Тест",
        },
      });
      console.log(`✅ Создан тестовый пользователь: ${testUser.id}`);
    } else {
      console.log(`👤 Найден тестовый пользователь: ${testUser.id}`);
    }

    // Добавляем тестового пользователя к счету
    console.log("➕ Добавляем тестового пользователя к счету...");
    
    const newParticipant = await prisma.billParticipant.create({
      data: {
        billId: billId,
        userId: testUser.id,
        telegramUserId: testTelegramUserId,
        name: testUser.firstName || "Тест",
        telegramUsername: testUser.username,
        shareAmount: 0.25, // Примерная сумма
        paymentStatus: "pending",
      },
    });

    console.log("✅ Тестовый пользователь добавлен к счету:");
    console.log(`   Participant ID: ${newParticipant.id}`);
    console.log(`   Имя: ${newParticipant.name}`);
    console.log(`   Сумма доли: ${newParticipant.shareAmount.toString()}`);
    console.log(`   Статус платежа: ${newParticipant.paymentStatus}`);

    // Проверяем обновленную информацию о счете
    const updatedBill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        participants: true,
      },
    });

    console.log(`📊 Общее количество участников: ${updatedBill?.participants.length}`);

  } catch (error) {
    console.error("❌ Ошибка при добавлении тестового пользователя:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestUserToBill();
