import { type FC, useEffect, useState } from "react";
import { useTelegram } from "../hooks/useTelegram";
import { useAppStore } from "../stores/appStore";

const BottomNavigation: FC = () => {
  const { hapticFeedback, webApp } = useTelegram();
  const { currentTab, setCurrentTab } = useAppStore();
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  useEffect(() => {
    if (webApp) {
      // Получаем информацию о безопасных зонах из Telegram WebApp
      const viewportStableHeight = webApp.viewportStableHeight;
      const viewportHeight = webApp.viewportHeight;

      // Вычисляем отступ снизу
      const bottomInset = viewportHeight - viewportStableHeight;
      setSafeAreaBottom(Math.max(bottomInset, 0));

      console.log("Telegram WebApp viewport info:", {
        viewportHeight,
        viewportStableHeight,
        bottomInset,
      });
    }
  }, [webApp]);

  const tabs = [
    {
      id: "bills" as const,
      label: "Счета",
      icon: "📋",
    },
    {
      id: "friends" as const,
      label: "Друзья",
      icon: "👥",
    },
    {
      id: "analytics" as const,
      label: "Аналитика",
      icon: "📊",
    },
    {
      id: "profile" as const,
      label: "Профайл",
      icon: "👤",
    },
    {
      id: "settings" as const,
      label: "Настройки",
      icon: "⚙️",
    },
  ];

  const handleTabClick = (tabId: typeof currentTab) => {
    hapticFeedback.selection();
    setCurrentTab(tabId);

    // Очищаем URL параметры при переключении на другие вкладки
    if (tabId !== "bills") {
      // URL параметры будут очищены автоматически при навигации
    }
  };

  return (
    <div
      className="bottom-navigation"
      style={{
        paddingBottom: `${8 + safeAreaBottom}px`,
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${currentTab === tab.id ? "active" : ""}`}
          onClick={() => handleTabClick(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default BottomNavigation;
