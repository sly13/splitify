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
      "API Interceptor - Test mode:",
      testMode,
      "VITE_TEST_MODE:",
      import.meta.env.VITE_TEST_MODE
    );

    // Всегда добавляем заголовок тестового режима
    config.headers.set("x-test-mode", testMode.toString());

    if (tg) {
      // Добавляем заголовки для аутентификации
      if (tg.initData) {
        config.headers.set("x-telegram-hash", tg.initDataUnsafe.hash || "");
        config.headers.set(
          "x-user-id",
          tg.initDataUnsafe.user?.id?.toString() || ""
        );
        config.headers.set("x-telegram-init-data", tg.initData);
      }
    } else if (testMode) {
      // В тестовом режиме добавляем тестовые заголовки
      config.headers.set("x-telegram-hash", "test_hash");
      config.headers.set("x-user-id", "123456789");
      config.headers.set("x-telegram-init-data", "test_init_data");
      config.headers.set("X-Telegram-Init-Data", "test_init_data");
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
    return response;
  },
  error => {
    // Обработка ошибок
    if (error.response) {
      // Сервер ответил с кодом ошибки
      const { status, data } = error.response;

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
      console.error("Network error:", error.message);
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

export default api;
