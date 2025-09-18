import { type FC, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { useTelegram } from "./hooks/useTelegram";
import { useAppStore } from "./stores/appStore";
import { useTheme } from "./hooks/useTheme";
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

  useEffect(() => {
    // Проверяем параметр startapp из Telegram WebApp
    const startParam = (webApp?.initDataUnsafe as any)?.start_param;
    if (startParam) {
      const billId = startParam;
      console.log("StartApp parameter found:", billId);

      // Перенаправляем на страницу счета
      navigate(`/bill/${billId}`);
    }
  }, [webApp, navigate]);

  return null;
};

const App: FC = () => {
  const { isReady } = useTelegram();
  const { hasSeenOnboarding } = useAppStore();

  // Инициализируем тему
  useTheme();

  if (!isReady) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Инициализация...</p>
      </div>
    );
  }

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

export default App;
