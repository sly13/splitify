import React, { useState } from "react";
import { useTelegram } from "../hooks/useTelegram";
import { useAppStore } from "../stores/appStore";
import { useTheme } from "../hooks/useTheme";

const SettingsPage: React.FC = () => {
  const { webApp } = useTelegram();
  const { setTheme } = useAppStore();
  const { isDark, isLight, isAuto } = useTheme();

  const [settings, setSettings] = useState({
    language: "ru",
    defaultCurrency: "USDT",
    notifications: true,
    hapticFeedback: true,
  });

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "auto") => {
    setTheme(newTheme);
  };

  const handleClearData = () => {
    if (confirm("Вы уверены, что хотите очистить все данные?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>⚙️ Настройки</h1>
        <p>Персонализация приложения</p>
      </div>

      <div className="settings-section">
        <h3>Общие</h3>

        <div className="setting-group">
          <label htmlFor="language">Язык</label>
          <select
            id="language"
            value={settings.language}
            onChange={e => handleSettingChange("language", e.target.value)}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="setting-group">
          <label htmlFor="currency">Валюта по умолчанию</label>
          <select
            id="currency"
            value={settings.defaultCurrency}
            onChange={e =>
              handleSettingChange("defaultCurrency", e.target.value)
            }
          >
            <option value="USDT">USDT</option>
            <option value="TON">TON</option>
          </select>
        </div>

        <div className="setting-group">
          <label htmlFor="theme">Тема</label>
          <div className="theme-selector">
            <button
              className={`theme-option ${isLight ? "active" : ""}`}
              onClick={() => handleThemeChange("light")}
            >
              <span className="theme-icon">☀️</span>
              <span className="theme-label">Светлая</span>
            </button>
            <button
              className={`theme-option ${isDark ? "active" : ""}`}
              onClick={() => handleThemeChange("dark")}
            >
              <span className="theme-icon">🌙</span>
              <span className="theme-label">Тёмная</span>
            </button>
            <button
              className={`theme-option ${isAuto ? "active" : ""}`}
              onClick={() => handleThemeChange("auto")}
            >
              <span className="theme-icon">🔄</span>
              <span className="theme-label">Авто</span>
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Уведомления</h3>

        <div className="setting-group">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={e =>
                handleSettingChange("notifications", e.target.checked)
              }
            />
            <span className="switch-slider"></span>
            Push уведомления
          </label>
        </div>

        <div className="setting-group">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={settings.hapticFeedback}
              onChange={e =>
                handleSettingChange("hapticFeedback", e.target.checked)
              }
            />
            <span className="switch-slider"></span>
            Тактильная обратная связь
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Данные</h3>

        <div className="setting-group">
          <button className="danger-button" onClick={handleClearData}>
            🗑️ Очистить все данные
          </button>
        </div>
      </div>

      <div className="app-info">
        <h3>О приложении</h3>
        <div className="info-item">
          <span>Версия</span>
          <span>1.0.0</span>
        </div>
        <div className="info-item">
          <span>Telegram WebApp</span>
          <span>{webApp?.version || "N/A"}</span>
        </div>
        <div className="info-item">
          <span>Платформа</span>
          <span>{webApp?.platform || "N/A"}</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
