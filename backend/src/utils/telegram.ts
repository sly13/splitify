import crypto from "crypto";
import { TelegramInitData } from "../types";

export function validateTelegramInitData(
  initData: string,
  botToken: string
): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");

    if (!hash) {
      return null;
    }

    // Удаляем hash из параметров для проверки
    urlParams.delete("hash");

    // Сортируем параметры по ключу
    const sortedParams = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Создаем секретный ключ из токена бота
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Вычисляем хеш
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(sortedParams)
      .digest("hex");

    // Проверяем подпись
    if (calculatedHash !== hash) {
      return null;
    }

    // Проверяем время (не старше 24 часов)
    const authDate = parseInt(urlParams.get("auth_date") || "0");
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      // 24 часа
      return null;
    }

    // Парсим данные пользователя
    const userParam = urlParams.get("user");
    let user = null;
    if (userParam) {
      user = JSON.parse(userParam);
    }

    return {
      user,
      auth_date: authDate,
      hash,
    };
  } catch (error) {
    console.error("Error validating Telegram init data:", error);
    return null;
  }
}

export function extractTelegramUserId(
  initData: TelegramInitData
): string | null {
  return initData.user?.id?.toString() || null;
}
