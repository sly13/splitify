import { FastifyRequest, FastifyReply } from "fastify";
import {
  validateTelegramInitData,
  extractTelegramUserId,
} from "../utils/telegram";
import { prisma } from "../config/database";
import { AuthenticatedUser } from "../types";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const initData = request.headers["x-telegram-init-data"] as string;
    const testModeHeader = request.headers["x-test-mode"] as string;
    // Определяем тестовый режим по наличию заголовка x-test-mode
    const isTestMode = !!testModeHeader && testModeHeader === "true";

    console.log("=== AUTH MIDDLEWARE START ===");
    console.log("🔐 Auth middleware - Test mode header:", testModeHeader);
    console.log("🔐 Auth middleware - Is test mode:", isTestMode);
    console.log("🔐 Auth middleware - URL:", request.url);
    console.log(
      "🔐 Auth middleware - initData:",
      initData ? "present" : "missing"
    );

    // Если фронтенд указал тестовый режим, используем тестового пользователя
    if (isTestMode) {
      console.log("Auth middleware - Using test user from database");

      // Найти тестового пользователя в базе данных
      let testUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: "test" },
            { telegramUserId: "123456789" },
            { firstName: "Тест" },
          ],
        },
      });

      if (!testUser) {
        // Если тестового пользователя нет, создаем его
        testUser = await prisma.user.create({
          data: {
            telegramUserId: "123456789",
            username: "test",
            firstName: "Тест",
          },
        });
        console.log("Auth middleware - Created test user:", testUser.id);
      } else {
        console.log("Auth middleware - Found test user:", testUser.id);
      }

      // Автоматически привязываем счета к тестовому пользователю
      await linkUserToBills(
        testUser.id,
        testUser.telegramUserId,
        testUser.username || undefined
      );

      request.user = testUser as AuthenticatedUser;
      console.log("✅ Auth middleware - Test user set:", {
        id: testUser.id,
        telegramUserId: testUser.telegramUserId,
        username: testUser.username,
        firstName: testUser.firstName,
      });
      return; // Завершаем middleware с тестовым пользователем
    }

    if (!initData) {
      console.log("Auth middleware - No init data found");

      // В продакшене без Telegram WebApp пытаемся получить данные из заголовков
      if (process.env.NODE_ENV === "production") {
        console.log(
          "Auth middleware - Production mode without Telegram, checking headers for user data"
        );

        // Получаем данные пользователя из заголовков
        const userId = request.headers["x-user-id"] as string;
        const username = request.headers["x-username"] as string;
        const firstName = request.headers["x-first-name"] as string;

        if (userId && userId !== "production_temp_user") {
          console.log("Auth middleware - Found user data in headers:", {
            userId,
            username,
            firstName,
          });

          // Создаем или находим пользователя по данным из заголовков
          const user = await prisma.user.upsert({
            where: { telegramUserId: userId },
            update: {
              username: username || undefined,
              firstName: firstName || undefined,
            },
            create: {
              telegramUserId: userId,
              username: username || "unknown",
              firstName: firstName || "Unknown User",
            },
          });

          request.user = user as AuthenticatedUser;
          return; // Продолжаем без ошибки
        }
      }

      return reply.status(401).send({ error: "Missing Telegram init data" });
    }

    let validatedData: any;
    let telegramUserId: string;

    // Проверяем, это тестовые данные, продакшн данные или реальные
    if (
      initData.includes("test_hash") ||
      initData.includes("production_hash")
    ) {
      // Тестовый/продакшн режим - парсим данные напрямую
      const urlParams = new URLSearchParams(initData);
      const userParam = urlParams.get("user");
      if (userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam));
        telegramUserId = userData.id.toString();
        validatedData = { user: userData };
        console.log("Auth middleware - Using test/production data:", userData);
      } else {
        return reply
          .status(401)
          .send({ error: "Invalid test/production data" });
      }
    } else {
      // Реальный режим - валидируем через Telegram
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return reply.status(500).send({ error: "Bot token not configured" });
      }

      validatedData = validateTelegramInitData(initData, botToken);
      if (!validatedData) {
        return reply.status(401).send({ error: "Invalid Telegram init data" });
      }

      const extractedUserId = extractTelegramUserId(validatedData);
      if (!extractedUserId) {
        return reply.status(401).send({ error: "No user ID in init data" });
      }
      telegramUserId = extractedUserId;
    }

    // Найти или создать пользователя
    let user = await prisma.user.findUnique({
      where: { telegramUserId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramUserId,
          username: validatedData.user?.username,
          firstName: validatedData.user?.first_name,
        },
      });
    } else {
      // Обновить данные пользователя если изменились
      if (
        user.username !== validatedData.user?.username ||
        user.firstName !== validatedData.user?.first_name
      ) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            username: validatedData.user?.username,
            firstName: validatedData.user?.first_name,
          },
        });
      }
    }

    // Автоматически привязываем счета к пользователю при входе
    await linkUserToBills(
      user.id,
      telegramUserId,
      validatedData.user?.username
    );

    request.user = user as AuthenticatedUser;
  } catch (error) {
    console.error("Auth middleware error:", error);
    return reply.status(500).send({ error: "Authentication failed" });
  }
}

// Функция для автоматической привязки счетов к пользователю
async function linkUserToBills(
  userId: string,
  telegramUserId: string,
  username?: string
) {
  try {
    // Находим участников счетов, которые еще не привязаны к пользователю
    const unlinkedParticipants = await prisma.billParticipant.findMany({
      where: {
        userId: null,
        OR: [
          { telegramUserId: telegramUserId },
          ...(username ? [{ telegramUsername: username }] : []),
        ],
      },
      include: {
        bill: true,
      },
    });

    if (unlinkedParticipants.length > 0) {
      // Обновляем участников, привязывая их к пользователю
      await prisma.billParticipant.updateMany({
        where: {
          id: { in: unlinkedParticipants.map(p => p.id) },
        },
        data: {
          userId: userId,
        },
      });

      console.log(
        `Linked ${unlinkedParticipants.length} bill participants to user ${userId}`
      );
    }
  } catch (error) {
    console.error("Error linking user to bills:", error);
    // Не прерываем аутентификацию из-за ошибки привязки
  }
}
