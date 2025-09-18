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
    const testMode = process.env.TEST_MODE === "true";

    console.log("Auth middleware - Test mode:", testMode);
    console.log("Auth middleware - URL:", request.url);
    console.log("Auth middleware - initData:", initData);

    // В тестовом режиме пропускаем аутентификацию для тестовых эндпоинтов
    if (
      testMode &&
      (request.url.includes("/test") || request.url.includes("/api/bills/test"))
    ) {
      console.log("Auth middleware - Skipping auth for test endpoint");
      return; // Пропускаем аутентификацию
    }

    if (!initData) {
      console.log("Auth middleware - No init data found");
      return reply.status(401).send({ error: "Missing Telegram init data" });
    }

    let validatedData: any;
    let telegramUserId: string;

    // Проверяем, это тестовые данные или реальные
    if (initData.includes("test_hash")) {
      // Тестовый режим - парсим данные напрямую
      const urlParams = new URLSearchParams(initData);
      const userParam = urlParams.get("user");
      if (userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam));
        telegramUserId = userData.id.toString();
        validatedData = { user: userData };
      } else {
        return reply.status(401).send({ error: "Invalid test data" });
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
