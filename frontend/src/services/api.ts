import axios, { type AxiosInstance, type AxiosResponse } from "axios";

// Определяем тестовый режим с безопасным дефолтом в dev
const isTestMode = (): boolean => {
  const envFlag = import.meta.env.VITE_TEST_MODE as string | undefined;
  // Если переменная не задана, в dev-режиме включаем тест по умолчанию
  const fallback = import.meta.env.DEV ? "true" : "false";
  return (envFlag ?? fallback) === "true";
};

// Базовый URL API (будет настроен в зависимости от окружения)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4041/api";

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
    const testMode = isTestMode();
    const endpoint = testMode ? "/bills/test" : "/bills";
    console.log("Using endpoint:", endpoint);
    return api.get(endpoint);
  },

  // Получить конкретный счет
  getBill: (billId: string): Promise<any> => {
    const testMode = isTestMode();
    const endpoint = testMode ? `/bills/test/${billId}` : `/bills/${billId}`;
    console.log("Getting bill with endpoint:", endpoint);
    return api.get(endpoint);
  },

  // Создать новый счет
  createBill: (data: any): Promise<any> => {
    const testMode = isTestMode();
    const endpoint = testMode ? "/bills/test" : "/bills";

    // Преобразуем данные участников для API
    const apiData = {
      ...data,
      participants: data.participants.map((participant: any) => ({
        name: participant.name,
        telegramUsername: participant.telegramUsername,
        shareAmount: participant.amount.toString(),
      })),
    };

    console.log("Creating bill with endpoint:", endpoint);
    console.log("API data:", apiData);
    return api.post(endpoint, apiData);
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
};

// API методы для работы с платежами
export const paymentApi = {
  // Создать платеж
  createPayment: (data: any): Promise<any> => {
    return api.post("/payments", data);
  },

  // Получить статус платежа
  getPaymentStatus: (paymentId: string): Promise<any> => {
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
  // Получить информацию о пользователе
  getUser: (): Promise<any> => {
    return api.get("/user");
  },

  // Обновить профиль пользователя
  updateProfile: (data: any): Promise<any> => {
    return api.put("/user/profile", data);
  },
};

// API методы для работы с друзьями
export const friendsApi = {
  // Получить список друзей
  getFriends: (): Promise<any> => {
    const testMode = isTestMode();
    const endpoint = testMode ? "/friends/test" : "/friends";
    console.log("Using friends endpoint:", endpoint);
    return api.get(endpoint);
  },

  // Добавить друга
  addFriend: (data: {
    name: string;
    telegramUsername?: string;
  }): Promise<any> => {
    return api.post("/friends", data);
  },

  // Обновить друга
  updateFriend: (
    friendId: string,
    data: { name?: string; telegramUsername?: string }
  ): Promise<any> => {
    return api.put(`/friends/${friendId}`, data);
  },

  // Удалить друга
  deleteFriend: (friendId: string): Promise<any> => {
    return api.delete(`/friends/${friendId}`);
  },

  // Поиск пользователя по username
  searchUser: (username: string): Promise<any> => {
    return api.get(`/friends/search/${username}`);
  },
};

export default api;
