import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log("=== ПОЛЬЗОВАТЕЛИ ===");
    const users = await prisma.user.findMany({
      include: {
        billsCreated: true,
        participants: true,
      },
    });

    users.forEach(user => {
      console.log(
        `Пользователь: ${
          user.firstName || user.username || user.telegramUserId
        }`
      );
      console.log(`  ID: ${user.id}`);
      console.log(`  Telegram ID: ${user.telegramUserId}`);
      console.log(`  Создал счетов: ${user.billsCreated.length}`);
      console.log(`  Участвует в счетах: ${user.participants.length}`);
      console.log("---");
    });

    console.log("\n=== СЧЕТА ===");
    const bills = await prisma.bill.findMany({
      include: {
        creator: true,
        participants: true,
      },
    });

    bills.forEach(bill => {
      console.log(`Счет: ${bill.title}`);
      console.log(`  ID: ${bill.id}`);
      console.log(
        `  Создатель: ${
          bill.creator.firstName ||
          bill.creator.username ||
          bill.creator.telegramUserId
        }`
      );
      console.log(`  Участников: ${bill.participants.length}`);
      console.log("---");
    });
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
