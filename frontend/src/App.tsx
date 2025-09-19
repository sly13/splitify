import { type FC, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useTelegram } from "./hooks/useTelegram";
import { useAppStore } from "./stores/appStore";
import { useTheme } from "./hooks/useTheme";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { userApi } from "./services/api";
import Layout from "./components/Layout";
import OnboardingPage from "./components/OnboardingPage";
import MainApp from "./components/MainApp";
import CreateBillPage from "./components/CreateBillPage";
import BillViewPage from "./components/BillViewPage";
import SuccessPage from "./components/SuccessPage";
import ErrorPage from "./components/ErrorPage";
import "./App.css";

// Компонент для обработки параметра startapp
const StartAppHandler: FC = () => {
  const navigate = useNavigate();
  const { webApp } = useTelegram();

  const handleStartApp = useCallback(
    async (billId: string) => {
      try {
        console.log("🔗 Processing startapp for bill:", billId);

        // Сначала создаем/обновляем пользователя
        await userApi.getMe();

        // Затем привязываем пользователя к счету
        const response = await fetch(`/api/bills/${billId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          console.log("✅ Successfully joined bill:", billId);
          // Перенаправляем на страницу счета
          navigate(`/bill/${billId}`);
        } else {
          console.error("❌ Failed to join bill:", response.status);
          // Все равно перенаправляем на страницу счета
          navigate(`/bill/${billId}`);
        }
      } catch (error) {
        console.error("❌ Error processing startapp:", error);
        // В случае ошибки все равно перенаправляем на страницу счета
        navigate(`/bill/${billId}`);
      }
    },
    [navigate]
  );

  useEffect(() => {
    // Проверяем параметр startapp из Telegram WebApp
    const startParam = (webApp?.initDataUnsafe as { start_param?: string })
      ?.start_param;
    if (startParam) {
      const billId = startParam.replace("bill_", ""); // Убираем префикс 'bill_'
      console.log("StartApp parameter found:", billId);

      // Создаем пользователя и привязываем к счету
      handleStartApp(billId);
    }
  }, [webApp, navigate, handleStartApp]);

  return null;
};

// Компонент для инициализации аутентификации
const AuthInitializer: FC = () => {
  const { isReady } = useTelegram();
  const { isAuthenticated, isLoading, authenticate } = useAuth();

  useEffect(() => {
    if (isReady && !isAuthenticated && !isLoading) {
      // В продакшене не ждем Telegram WebApp
      const isProduction = !import.meta.env.DEV;
      const hasTelegramWebApp = window.Telegram?.WebApp;

      if (isProduction && !hasTelegramWebApp) {
        console.log(
          "🚀 Production mode without Telegram WebApp - skipping authentication"
        );
        // В продакшене без Telegram WebApp пропускаем аутентификацию
        return;
      }

      authenticate().catch(error => {
        console.error("Failed to authenticate:", error);
      });
    }
  }, [isReady, isAuthenticated, isLoading, authenticate]);

  // В продакшене без Telegram WebApp не показываем загрузку
  const isProduction = !import.meta.env.DEV;
  const hasTelegramWebApp = window.Telegram?.WebApp;

  if (isProduction && !hasTelegramWebApp) {
    return <AppContent />;
  }

  if (!isReady || isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>{!isReady ? "Инициализация..." : "Аутентификация..."}</p>
      </div>
    );
  }

  return <AppContent />;
};

// Основной контент приложения
const AppContent: FC = () => {
  const { hasSeenOnboarding } = useAppStore();

  // Инициализируем тему
  useTheme();

  return (
    <Router>
      <StartAppHandler />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={hasSeenOnboarding ? <MainApp /> : <OnboardingPage />}
          />
          <Route path="home" element={<MainApp />} />
          <Route path="create" element={<CreateBillPage />} />
          <Route path="bill/:id" element={<BillViewPage />} />
          <Route path="success" element={<SuccessPage />} />
          <Route path="error" element={<ErrorPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

// Главный компонент приложения
const App: FC = () => {
  const manifestUrl = import.meta.env.DEV
    ? "http://localhost:4040/tonconnect-manifest.json"
    : "https://splitify.vadimsemenko.ru/tonconnect-manifest.json";

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <AuthProvider>
        <AuthInitializer />
      </AuthProvider>
    </TonConnectUIProvider>
  );
};

export default App;
