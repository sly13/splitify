import React, { useState } from "react";
import { useTelegram } from "../hooks/useTelegram";

const ProfilePage: React.FC = () => {
  const { user, webApp, colorScheme } = useTelegram();

  const [settings, setSettings] = useState({
    language: "ru",
    defaultCurrency: "USDT",
    theme: colorScheme,
  });

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // const handleBack = () => {
  //   webApp?.BackButton.onClick(() => {
  //     // TODO: Navigate back
  //   });
  // };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="user-info">
          <div className="user-avatar">
            {user?.photo_url ? (
              <img src={user.photo_url} alt={user.first_name} />
            ) : (
              <span>{user?.first_name?.[0] || "?"}</span>
            )}
          </div>
          <div className="user-details">
            <h2>
              {user?.first_name} {user?.last_name}
            </h2>
            {user?.username && <p>@{user.username}</p>}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Настройки</h3>

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
          <select
            id="theme"
            value={settings.theme}
            onChange={e => handleSettingChange("theme", e.target.value)}
          >
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
            <option value="auto">Автоматически</option>
          </select>
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

export default ProfilePage;
