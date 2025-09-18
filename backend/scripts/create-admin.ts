import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const username = "admin";
    const password = "admin123";

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Проверяем, существует ли уже админ
    const existingAdmin = await prisma.admin.findUnique({
      where: { username },
    });

    if (existingAdmin) {
      console.log("Админ уже существует");
      return;
    }

    // Создаем админа
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    console.log("Админ создан успешно:");
    console.log("Username:", admin.username);
    console.log("Password:", password);
    console.log("ID:", admin.id);
  } catch (error) {
    console.error("Ошибка при создании админа:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
