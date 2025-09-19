import axios, { type AxiosInstance, type AxiosResponse } from "axios";

// Определяем тестовый режим с безопасным дефолтом в dev
const isTestMode = (): boolean => {
  const envFlag = import.meta.env.VITE_TEST_MODE as string | undefined;
  // Если переменная не задана, в dev-режиме включаем тест по умолчанию
  const fallback = import.meta.env.DEV ? "true" : "false";
  return (envFlag ?? fallback) === "true";
};

// Базовый URL API (будет настроен в зависимости от окружения)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

console.log("🔧 API Configuration:", {
  API_BASE_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_TEST_MODE: import.meta.env.VITE_TEST_MODE,
  location: window.location.href,
  origin: window.location.origin,
});

// Создание экземпляра Axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Интерсептор для добавления Telegram заголовков
api.interceptors.request.use(
  config => {
    // Получаем данные Telegram WebApp из window
    const tg = window.Telegram?.WebApp;
    const testMode = isTestMode();
    console.log(
      "🌐 API Request:",
      config.method?.toUpperCase(),
      config.url,
      "Base URL:",
      config.baseURL,
      "Full URL:",
      `${config.baseURL}${config.url}`
    );
    console.log(
      "API Interceptor - Test mode:",
      testMode,
      "VITE_TEST_MODE:",
      import.meta.env.VITE_TEST_MODE,
      "Has Telegram WebApp:",
      !!tg
    );

    // Не добавляем заголовок x-test-mode - определяем режим по его отсутствию

    if (tg) {
      // Добавляем заголовки для аутентификации
      if (tg.initData) {
        config.headers.set("x-telegram-hash", tg.initDataUnsafe.hash || "");
        // config.headers.set(
        //   "x-user-id",
        //   tg.initDataUnsafe.user?.id?.toString() || ""
        // );
        config.headers.set("x-telegram-init-data", tg.initData);
      }
    } else if (testMode) {
      // В тестовом режиме добавляем тестовые заголовки
      config.headers.set("x-telegram-hash", "test_hash");
      config.headers.set("x-user-id", "123456789");
      config.headers.set("x-telegram-init-data", "test_init_data");
      config.headers.set("X-Telegram-Init-Data", "test_init_data");
    } else if (process.env.NODE_ENV === "production") {
      // В продакшене без Telegram WebApp создаем данные в формате Telegram
      console.log(
        "🚀 Production mode without Telegram WebApp - using production data"
      );

      const userId = "7148394161"; // Используем ID из вашего примера
      const authDate = Math.floor(Date.now() / 1000);
      const userData = {
        id: parseInt(userId),
        first_name: "Production",
        last_name: "User",
        username: "production_user",
        language_code: "ru",
      };

      // Создаем initData в формате Telegram
      const initData = `query_id=AAGx1hMqAwAAALHWEyp4AOq7&user=${encodeURIComponent(
        JSON.stringify(userData)
      )}&auth_date=${authDate}&hash=production_hash`;

      // Отправляем только x-telegram-init-data - в нем есть вся информация
      config.headers.set("x-telegram-init-data", initData);
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Интерсептор для обработки ответов
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log("✅ API Response:", response.status, response.config.url);
    return response;
  },
  error => {
    console.error("❌ API Error:", error);

    // Обработка ошибок
    if (error.response) {
      // Сервер ответил с кодом ошибки
      const { status, data } = error.response;
      console.error("Server responded with error:", status, data);

      switch (status) {
        case 401:
          // Неавторизован - возможно нужно обновить токен
          console.error("Unauthorized access");
          break;
        case 403:
          // Доступ запрещен
          console.error("Access forbidden");
          break;
        case 404:
          // Ресурс не найден
          console.error("Resource not found");
          break;
        case 500:
          // Внутренняя ошибка сервера
          console.error("Internal server error");
          break;
        default:
          console.error("API Error:", data?.message || "Unknown error");
      }
    } else if (error.request) {
      // Запрос был отправлен, но ответ не получен
      console.error("Network error - no response received:", error.message);
      console.error("Request config:", error.config);
    } else {
      // Что-то пошло не так при настройке запроса
      console.error("Request setup error:", error.message);
    }

    return Promise.reject(error);
  }
);

// API методы для работы с счетами
export const billApi = {
  // Получить все счета пользователя
  getBills: (): Promise<any> => {
    console.log("Using bills endpoint: /bills");
    return api.get("/bills");
  },

  // Получить конкретный счет
  getBill: (billId: string): Promise<any> => {
    console.log("Getting bill with endpoint:", `/bills/${billId}`);
    return api.get(`/bills/${billId}`);
  },

  // Создать новый счет
  createBill: (data: any): Promise<any> => {
    // Преобразуем данные участников для API
    const apiData = {
      ...data,
      participants: data.participants.map((participant: any) => ({
        name: participant.name,
        telegramUsername: participant.telegramUsername || undefined,
        shareAmount: participant.amount.toString(),
        isPayer: participant.isPayer || false,
      })),
      creatorWalletAddress: data.creatorWalletAddress || undefined,
    };

    console.log("Creating bill with endpoint: /bills");
    console.log("API data:", apiData);
    return api.post("/bills", apiData);
  },

  // Присоединиться к счету
  joinBill: (billId: string, data: any): Promise<any> => {
    return api.post(`/bills/${billId}/join`, data);
  },

  // Обновить счет
  updateBill: (billId: string, data: any): Promise<any> => {
    return api.put(`/bills/${billId}`, data);
  },

  // Удалить счет
  deleteBill: (billId: string): Promise<any> => {
    return api.delete(`/bills/${billId}`);
  },

  // Отметить участника как плательщика за весь счёт
  markPayer: (
    billId: string,
    participantId: string,
    isPayer: boolean
  ): Promise<any> => {
    return api.put(`/bills/${billId}/participants/${participantId}/payer`, {
      isPayer,
    });
  },
};

// API методы для работы с платежами
export const paymentApi = {
  // Создать платеж
  createPayment: (data: any): Promise<any> => {
    console.log("Using create payment endpoint: /payments/intent");
    return api.post("/payments/intent", data);
  },

  // Получить статус платежа
  getPaymentStatus: (paymentId: string): Promise<any> => {
    console.log(
      "Using get payment status endpoint:",
      `/payments/${paymentId}/status`
    );
    return api.get(`/payments/${paymentId}/status`);
  },

  // Подтвердить платеж
  confirmPayment: (
    paymentId: string,
    transactionHash: string
  ): Promise<any> => {
    return api.post(`/payments/${paymentId}/confirm`, { transactionHash });
  },
};

// API методы для работы с пользователями
export const userApi = {
  // Инициализировать пользователя (создать если не существует)
  initUser: (): Promise<any> => {
    const testMode = isTestMode();
    if (testMode) {
      console.log("Initializing test user");
      return api.post("/user/init");
    } else {
      // В продакшн режиме просто получаем информацию о пользователе
      return userApi.getMe();
    }
  },

  // Получить краткую информацию о текущем пользователе
  getMe: (): Promise<any> => {
    const testMode = isTestMode();
    const endpoint = testMode ? "/me/test" : "/me";
    console.log("Using me endpoint:", endpoint);
    return api.get(endpoint);
  },

  // Получить информацию о пользователе
  getUser: (): Promise<any> => {
    return api.get("/user/profile");
  },

  // Обновить профиль пользователя
  updateProfile: (data: any): Promise<any> => {
    return api.put("/user/profile", data);
  },

  // Получить статистику пользователя
  getUserStats: (): Promise<any> => {
    return api.get("/user/stats");
  },
};

// API методы для работы с друзьями
export const friendsApi = {
  // Получить список друзей
  getFriends: (): Promise<any> => {
    console.log("Using friends endpoint: /friends");
    return api.get("/friends");
  },

  // Добавить друга
  addFriend: (data: {
    name: string;
    telegramUsername?: string;
  }): Promise<any> => {
    console.log("Using add friend endpoint: /friends");
    return api.post("/friends", data);
  },

  // Обновить друга
  updateFriend: (
    friendId: string,
    data: { name?: string; telegramUsername?: string }
  ): Promise<any> => {
    console.log("Using update friend endpoint:", `/friends/${friendId}`);
    return api.put(`/friends/${friendId}`, data);
  },

  // Удалить друга
  deleteFriend: (friendId: string): Promise<any> => {
    console.log("Using delete friend endpoint:", `/friends/${friendId}`);
    return api.delete(`/friends/${friendId}`);
  },

  // Поиск пользователя по username
  searchUser: (username: string): Promise<any> => {
    console.log("Using search user endpoint:", `/friends/search/${username}`);
    return api.get(`/friends/search/${username}`);
  },
};

// Интерфейсы для аналитики
interface AnalyticsResponse {
  success: boolean;
  data: {
    stats: {
      totalBills: number;
      completedBills: number;
      activeBills: number;
      totalAmount: number;
      paidAmount: number;
      completionRate: number;
      remainingAmount: number;
    };
    friendsDebts: Array<{
      name: string;
      telegramUsername?: string;
      totalDebt: number;
      billsCount: number;
      bills: Array<{ id: string; title: string; amount: number }>;
    }>;
  };
}

interface FriendAnalyticsResponse {
  success: boolean;
  data: {
    friendId: string;
    totalDebt: number;
    debts: Array<{
      billId: string;
      billTitle: string;
      amount: number;
      currency: string;
      createdAt: string;
      status: string;
    }>;
  };
}

// API методы для аналитики
export const analyticsApi = {
  // Получить аналитику долгов
  getDebtsAnalytics: (): Promise<{ data: AnalyticsResponse }> => {
    console.log("Using analytics endpoint: /analytics/debts");
    return api.get("/analytics/debts");
  },

  // Получить детальную аналитику по конкретному другу
  getFriendDebtsAnalytics: (
    friendId: string
  ): Promise<{ data: FriendAnalyticsResponse }> => {
    console.log(
      "Using friend analytics endpoint:",
      `/analytics/debts/${friendId}`
    );
    return api.get(`/analytics/debts/${friendId}`);
  },
};

// Функция для тестирования подключения к API
export const testApiConnection = async (): Promise<boolean> => {
  try {
    // Убираем /api из URL для health check, так как он находится в корне
    const baseUrl = API_BASE_URL.replace("/api", "");
    const healthUrl = `${baseUrl}/health`;
    console.log("🧪 Testing API connection to:", healthUrl);

    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("🔍 Health check response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API connection successful, data:", data);
      return true;
    } else {
      console.error(
        "❌ API connection failed:",
        response.status,
        response.statusText
      );
      return false;
    }
  } catch (error: any) {
    console.error("❌ API connection error:", error);
    console.error("Error details:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    return false;
  }
};

export default api;
