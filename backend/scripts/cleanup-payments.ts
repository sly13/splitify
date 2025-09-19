import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function cleanupPayments() {
  try {
    console.log("🧹 Начинаем очистку старых платежей...");

    // Находим все платежи со статусом "created" или "pending"
    const oldPayments = await prisma.payment.findMany({
      where: {
        status: { in: ["created", "pending"] },
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // старше 24 часов
        },
      },
      include: {
        participant: true,
      },
    });

    console.log(`📊 Найдено ${oldPayments.length} старых платежей`);

    if (oldPayments.length > 0) {
      console.log("📋 Детали старых платежей:");
      oldPayments.forEach((payment, index) => {
        console.log(`${index + 1}. Payment ID: ${payment.id}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Created: ${payment.createdAt}`);
        console.log(`   Participant: ${payment.participant.name}`);
        console.log(`   Amount: ${payment.amount.toString()}`);
        console.log("---");
      });

      // Обновляем статус участников
      for (const payment of oldPayments) {
        await prisma.billParticipant.update({
          where: { id: payment.participantId },
          data: {
            paymentStatus: "pending",
            paymentId: null,
          },
        });
      }

      // Удаляем старые платежи
      const deleteResult = await prisma.payment.deleteMany({
        where: {
          id: { in: oldPayments.map(p => p.id) },
        },
      });

      console.log(`✅ Удалено ${deleteResult.count} старых платежей`);
    } else {
      console.log("✅ Старых платежей не найдено");
    }

    // Также проверим все платежи со статусом "created" или "pending"
    const allPendingPayments = await prisma.payment.findMany({
      where: {
        status: { in: ["created", "pending"] },
      },
      include: {
        participant: true,
      },
    });

    console.log(`📊 Всего активных платежей: ${allPendingPayments.length}`);
    
    if (allPendingPayments.length > 0) {
      console.log("📋 Активные платежи:");
      allPendingPayments.forEach((payment, index) => {
        console.log(`${index + 1}. Payment ID: ${payment.id}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Created: ${payment.createdAt}`);
        console.log(`   Participant: ${payment.participant.name}`);
        console.log(`   Amount: ${payment.amount.toString()}`);
        console.log("---");
      });
    }

  } catch (error) {
    console.error("❌ Ошибка при очистке платежей:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupPayments();
