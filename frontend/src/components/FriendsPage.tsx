import React, { useState, useEffect } from "react";
import { useTelegram } from "../hooks/useTelegram";
import { friendsApi } from "../services/api";

interface Friend {
  id: string;
  name: string;
  telegramUsername?: string;
  createdAt: string;
}

interface FriendsPageProps {
  onCreateBill?: () => void;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({ onCreateBill }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFriend, setNewFriend] = useState({
    name: "",
    telegramUsername: "",
  });
  const { hapticFeedback, showAlert, showSuccess } = useTelegram();

  // Загружаем список друзей
  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await friendsApi.getFriends();
      setFriends(response.data.friends || []);
      setError(null);
    } catch (err) {
      setError("Ошибка соединения");
      console.error("Ошибка загрузки друзей:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!newFriend.name.trim()) {
      hapticFeedback.notification("error");
      showAlert("Введите имя друга");
      return;
    }

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:4041/api";
      const response = await fetch(`${API_BASE_URL}/friends`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Init-Data": window.Telegram?.WebApp?.initData || "",
        },
        body: JSON.stringify({
          name: newFriend.name.trim(),
          telegramUsername: newFriend.telegramUsername.replace("@", ""),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(prev => [data.friend, ...prev]);
        setNewFriend({ name: "", telegramUsername: "" });
        setShowAddForm(false);
        hapticFeedback.notification("success");
        showSuccess("Друг добавлен!");
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Ошибка добавления друга");
      }
    } catch (err) {
      showAlert("Ошибка соединения");
      console.error("Ошибка добавления друга:", err);
    }
  };

  const handleDeleteFriend = async (friendId: string) => {
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:4041/api";
      const response = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
        method: "DELETE",
        headers: {
          "X-Telegram-Init-Data": window.Telegram?.WebApp?.initData || "",
        },
      });

      if (response.ok) {
        setFriends(prev => prev.filter(friend => friend.id !== friendId));
        hapticFeedback.notification("success");
        showSuccess("Друг удален");
      } else {
        showAlert("Ошибка удаления друга");
      }
    } catch (err) {
      showAlert("Ошибка соединения");
      console.error("Ошибка удаления друга:", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="friends-page">
        <div className="header">
          <h1>👥 Друзья</h1>
          <p>Управляйте списком друзей для быстрого создания счетов</p>
        </div>
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <div className="header">
        <h1>👥 Друзья</h1>
        <p>Управляйте списком друзей для быстрого создания счетов</p>
      </div>

      {error && (
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <div className="error-text">{error}</div>
          <button onClick={loadFriends} className="error-retry-btn">
            Повторить
          </button>
        </div>
      )}

      {/* Кнопка добавления друга */}
      {!showAddForm && (
        <div className="actions">
          <button
            onClick={() => setShowAddForm(true)}
            className="primary-button"
          >
            + Добавить друга
          </button>
        </div>
      )}

      {/* Форма добавления друга */}
      {showAddForm && (
        <div className="bill-form">
          <h2>Добавить нового друга</h2>

          <div className="form-group">
            <label>Имя друга</label>
            <input
              type="text"
              value={newFriend.name}
              onChange={e =>
                setNewFriend({ ...newFriend, name: e.target.value })
              }
              placeholder="Введите имя"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Telegram username (опционально)</label>
            <input
              type="text"
              value={newFriend.telegramUsername}
              onChange={e => {
                let value = e.target.value;
                if (value && !value.startsWith("@")) {
                  value = "@" + value;
                }
                setNewFriend({ ...newFriend, telegramUsername: value });
              }}
              placeholder="@username"
            />
          </div>

          <div className="form-actions">
            <button onClick={handleAddFriend} className="primary-button">
              Добавить
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewFriend({ name: "", telegramUsername: "" });
              }}
              className="secondary-button"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список друзей */}
      {friends.length > 0 ? (
        <div className="friends-section">
          <h2>Мои друзья</h2>
          <div className="friends-list">
            {friends.map(friend => (
              <div key={friend.id} className="friend-card">
                <div className="friend-info">
                  <div className="friend-avatar">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-details">
                    <h3>{friend.name}</h3>
                    {friend.telegramUsername && (
                      <p>@{friend.telegramUsername}</p>
                    )}
                    <span className="friend-date">
                      Добавлен {formatDate(friend.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="friend-actions">
                  {onCreateBill && (
                    <button
                      onClick={() => {
                        hapticFeedback.selection();
                        onCreateBill();
                      }}
                      className="create-bill-btn"
                    >
                      Создать счет
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteFriend(friend.id)}
                    className="delete-btn"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>Нет друзей</h3>
          <p>Добавьте друзей для быстрого создания счетов</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="primary-button"
          >
            Добавить первого друга
          </button>
        </div>
      )}

      {/* Статистика */}
      {friends.length > 0 && (
        <div className="friends-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{friends.length}</div>
              <div className="stat-label">Всего друзей</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
