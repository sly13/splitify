import axios from "axios";
import { LoginRequest, LoginResponse, User, Bill, Stats } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4041";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Добавляем токен к запросам
api.interceptors.request.use(config => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обработка ошибок авторизации
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  // Аутентификация
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post("/admin/login", credentials);
    return response.data;
  },

  verify: async () => {
    const response = await api.get("/admin/verify");
    return response.data;
  },

  // Данные
  getUsers: async (): Promise<{ users: User[] }> => {
    const response = await api.get("/admin/users");
    return response.data;
  },

  getBills: async (): Promise<{ bills: Bill[] }> => {
    const response = await api.get("/admin/bills");
    return response.data;
  },

  getStats: async (): Promise<{ stats: Stats }> => {
    const response = await api.get("/admin/stats");
    return response.data;
  },

  // Друзья
  getFriends: async (): Promise<{ friends: any[] }> => {
    const response = await api.get("/admin/friends");
    return response.data;
  },

  getFriendsStats: async (): Promise<{ stats: any }> => {
    const response = await api.get("/admin/friends/stats");
    return response.data;
  },

  deleteFriend: async (friendId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/friends/${friendId}`);
    return response.data;
  },
};

export default api;
