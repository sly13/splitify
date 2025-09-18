import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testTonWallet() {
  try {
    console.log("🧪 Тестирование функциональности кошелька TON...");

    // Найдем первого пользователя
    const user = await prisma.user.findFirst();

    if (!user) {
      console.log("❌ Пользователи не найдены. Создайте пользователя сначала.");
      return;
    }

    console.log(`👤 Найден пользователь: ${user.firstName} (${user.username})`);

    // Обновим адрес кошелька TON
    const testWalletAddress = "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH";

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { tonWalletAddress: testWalletAddress },
    });

    console.log(
      `✅ Адрес кошелька TON обновлен: ${updatedUser.tonWalletAddress}`
    );

    // Проверим, что адрес сохранился
    const checkUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (checkUser?.tonWalletAddress === testWalletAddress) {
      console.log("✅ Адрес кошелька TON успешно сохранен в базе данных");
    } else {
      console.log("❌ Ошибка: адрес кошелька TON не сохранился");
    }

    // Очистим тестовые данные
    await prisma.user.update({
      where: { id: user.id },
      data: { tonWalletAddress: null },
    });

    console.log("🧹 Тестовые данные очищены");
  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testTonWallet();
