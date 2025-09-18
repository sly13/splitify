import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { userApi, testApiConnection } from "../services/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  authenticate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  const authenticate = async () => {
    if (isAuthenticated || isLoading) {
      console.log(
        "🔐 Authentication skipped - already authenticated or loading"
      );
      return;
    }

    // Проверяем, есть ли Telegram WebApp
    const hasTelegramWebApp = !!window.Telegram?.WebApp;
    const isProduction = !import.meta.env.DEV;

    if (isProduction && !hasTelegramWebApp) {
      console.log(
        "🚀 Production mode without Telegram WebApp - checking URL params for user data"
      );

      // Получаем данные пользователя из URL параметров
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");
      const username = urlParams.get("username");
      const firstName = urlParams.get("first_name");

      if (userId) {
        console.log("🚀 Found user data in URL:", {
          userId,
          username,
          firstName,
        });

        // Сохраняем данные в localStorage
        localStorage.setItem("user_id", userId);
        if (username) localStorage.setItem("username", username);
        if (firstName) localStorage.setItem("first_name", firstName);

        // Устанавливаем пользователя
        setUser({
          id: userId,
          firstName: firstName || "Unknown User",
          username: username || "unknown",
          telegramUserId: userId,
        });

        setIsAuthenticated(true);
        return;
      }

      // Если данных нет, показываем ошибку
      console.error("❌ No user data found in URL parameters");
      setIsAuthenticated(false);
      return;
    }

    console.log("🔐 Starting authentication process...");
    setIsLoading(true);
    try {
      console.log("🔐 Authenticating user...");

      // Сначала тестируем подключение к API
      console.log("🧪 Testing API connection...");
      const apiAvailable = await testApiConnection();
      if (!apiAvailable) {
        console.error("❌ API is not available");
        setIsAuthenticated(true); // Продолжаем работу без API
        return;
      }

      console.log("✅ API is available, proceeding with authentication...");
      // Вызываем аутентификацию (создает пользователя если не существует)
      const response = await userApi.getMe();

      if (response.data?.success) {
        console.log("✅ User authenticated:", response.data.data);
        setUser(response.data.data);
        setIsAuthenticated(true);
      } else {
        console.error("❌ Authentication failed:", response.data);
        // В продакшене продолжаем работу даже при ошибке аутентификации
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("❌ Authentication error:", error);
      // В продакшене продолжаем работу даже при ошибке аутентификации
      console.log("⚠️ Continuing without authentication in production");
      setIsAuthenticated(true);
    } finally {
      console.log("🔐 Authentication process completed");
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    authenticate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
