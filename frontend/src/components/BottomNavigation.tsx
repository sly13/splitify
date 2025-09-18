import { type FC } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";
import { useAppStore } from "../stores/appStore";

const BottomNavigation: FC = () => {
  const { hapticFeedback } = useTelegram();
  const { currentTab, setCurrentTab } = useAppStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
      setSearchParams({});
    }
  };

  return (
    <div className="bottom-navigation">
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
