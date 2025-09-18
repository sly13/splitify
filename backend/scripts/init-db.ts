import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Initializing database...");

  try {
    // Проверяем подключение к базе данных
    await prisma.$connect();
    console.log("✅ Database connection successful");

    // Здесь можно добавить начальные данные если нужно
    console.log("✅ Database initialization completed");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
