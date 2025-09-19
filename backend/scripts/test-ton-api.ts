import axios from "axios";
import dotenv from "dotenv";

// Загружаем переменные окружения из .env файла
dotenv.config();

async function testTonApi() {
  const TON_API_KEY = process.env.TON_API_KEY;
  const TON_API_URL = "https://tonapi.io/v2";

  if (!TON_API_KEY) {
    console.error("❌ TON_API_KEY не найден в переменных окружения");
    console.log("📝 Добавьте TON_API_KEY в файл .env");
    console.log("🔗 Получить ключ можно на: https://tonapi.io/");
    return;
  }

  console.log("🔑 Тестируем TON API...");
  console.log(`📡 API URL: ${TON_API_URL}`);
  console.log(`🔐 API Key: ${TON_API_KEY.substring(0, 10)}...`);

  try {
    // Тестируем получение информации о сети
    console.log("\n🌐 Проверяем статус сети...");
    const networkResponse = await axios.get(
      `${TON_API_URL}/blockchain/config`,
      {
        headers: {
          Authorization: `Bearer ${TON_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    console.log("✅ Сеть доступна:", networkResponse.data);

    // Тестируем получение транзакций для тестового адреса
    console.log("\n📊 Проверяем получение транзакций...");
    const testAddress =
      "0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f";

    const transactionsResponse = await axios.get(
      `${TON_API_URL}/accounts/${testAddress}/events`,
      {
        headers: {
          Authorization: `Bearer ${TON_API_KEY}`,
          Accept: "application/json",
        },
        params: {
          limit: 5,
        },
      }
    );

    console.log("✅ События получены:", {
      count: transactionsResponse.data.events?.length || 0,
      sample: transactionsResponse.data.events?.[0] || "Нет событий",
    });

    console.log("\n🎉 TON API работает корректно!");
    console.log("📝 Теперь можно использовать мониторинг платежей");
  } catch (error: any) {
    console.error("❌ Ошибка при тестировании TON API:");

    if (error.response) {
      console.error("📡 Статус:", error.response.status);
      console.error("📄 Ответ:", error.response.data);

      if (error.response.status === 401) {
        console.error("🔐 Проблема с авторизацией - проверьте TON_API_KEY");
      } else if (error.response.status === 403) {
        console.error("🚫 Доступ запрещен - проверьте права API ключа");
      } else if (error.response.status === 429) {
        console.error("⏰ Превышен лимит запросов - попробуйте позже");
      }
    } else {
      console.error("🌐 Сетевая ошибка:", error.message);
    }
  }
}

// Запуск теста
testTonApi().catch(console.error);
