import React, { useState } from "react";
import { useTelegram } from "../hooks/useTelegram";
import { useAppStore } from "../stores/appStore";
import { useTheme } from "../hooks/useTheme";
import CustomSelect from "./CustomSelect";

const SettingsPage: React.FC = () => {
  const { webApp } = useTelegram();
  const { setTheme } = useAppStore();
  const { isDark, isLight, isAuto } = useTheme();

  const [settings, setSettings] = useState({
    language: "ru",
    defaultCurrency: "USDT",
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
          <CustomSelect
            options={[
              { value: "ru", label: "Русский", icon: "🇷🇺" },
              { value: "en", label: "English", icon: "🇺🇸" },
            ]}
            value={settings.language}
            onChange={value => handleSettingChange("language", value)}
            placeholder="Выберите язык"
          />
        </div>

        <div className="setting-group">
          <label htmlFor="currency">Валюта по умолчанию</label>
          <CustomSelect
            options={[
              { value: "USDT", label: "USDT", icon: "💵" },
              { value: "TON", label: "TON", icon: "💎" },
            ]}
            value={settings.defaultCurrency}
            onChange={value => handleSettingChange("defaultCurrency", value)}
            placeholder="Выберите валюту"
          />
        </div>

        <div className="setting-group">
          <label htmlFor="theme">Тема</label>
          <CustomSelect
            options={[
              { value: "light", label: "Светлая", icon: "☀️" },
              { value: "dark", label: "Тёмная", icon: "🌙" },
              { value: "auto", label: "Авто", icon: "🔄" },
            ]}
            value={isLight ? "light" : isDark ? "dark" : "auto"}
            onChange={handleThemeChange}
            placeholder="Выберите тему"
          />
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
