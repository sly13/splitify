import { useEffect, useState } from "react";
import type { TelegramWebApp, TelegramUser } from "../types/telegram";

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const testMode = import.meta.env.VITE_TEST_MODE === "true";

    if (tg) {
      setWebApp(tg);

      // Инициализация WebApp
      tg.ready();
      tg.expand();

      // Получение данных пользователя
      if (tg.initDataUnsafe.user) {
        setUser(tg.initDataUnsafe.user);
      }

      setIsReady(true);
    } else if (testMode) {
      // В тестовом режиме создаем тестового пользователя
      const testUser: TelegramUser = {
        id: 123456789,
        first_name: "Тест",
        last_name: "Пользователь",
        username: "test_user",
        language_code: "ru",
        is_premium: false,
        photo_url: "",
      };
      
      setUser(testUser);
      setIsReady(true);

      // Настройка темы для тестового режима
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#000000";

      // Применение CSS переменных для темы
      const root = document.documentElement;
      root.style.setProperty("--tg-theme-bg-color", "#ffffff");
      root.style.setProperty("--tg-theme-text-color", "#000000");
      root.style.setProperty("--tg-theme-hint-color", "#999999");
      root.style.setProperty("--tg-theme-link-color", "#2481cc");
      root.style.setProperty("--tg-theme-button-color", "#2481cc");
      root.style.setProperty("--tg-theme-button-text-color", "#ffffff");
      root.style.setProperty("--tg-theme-secondary-bg-color", "#f1f1f1");
    } else {
      // Если нет Telegram WebApp и не тестовый режим
      setIsReady(true);
    }
  }, []);

  const close = () => {
    webApp?.close();
  };

  const showAlert = (message: string) => {
    webApp?.HapticFeedback.notificationOccurred("warning");
    alert(message);
  };

  const showSuccess = (message: string) => {
    webApp?.HapticFeedback.notificationOccurred("success");
    alert(message);
  };

  const showError = (message: string) => {
    webApp?.HapticFeedback.notificationOccurred("error");
    alert(message);
  };

  const hapticFeedback = {
    impact: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => {
      webApp?.HapticFeedback.impactOccurred(style);
    },
    notification: (type: "error" | "success" | "warning") => {
      webApp?.HapticFeedback.notificationOccurred(type);
    },
    selection: () => {
      webApp?.HapticFeedback.selectionChanged();
    },
  };

  return {
    webApp,
    user,
    isReady,
    close,
    showAlert,
    showSuccess,
    showError,
    hapticFeedback,
    initData: webApp?.initData || "",
    initDataUnsafe: webApp?.initDataUnsafe || {},
    themeParams: webApp?.themeParams || {},
    colorScheme: webApp?.colorScheme || "light",
  };
};
