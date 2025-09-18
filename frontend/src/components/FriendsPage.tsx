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
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">👥 Друзья</h1>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">👥 Друзья</h1>
        <p className="page-subtitle">
          Управляйте списком друзей для быстрого создания счетов
        </p>
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
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="primary-button w-full"
          >
            + Добавить друга
          </button>
        </div>
      )}

      {/* Форма добавления друга */}
      {showAddForm && (
        <div className="card mb-6">
          <h3 className="card-title">Добавить нового друга</h3>

          <div className="form-group">
            <label className="form-label">Имя друга</label>
            <input
              type="text"
              value={newFriend.name}
              onChange={e =>
                setNewFriend({ ...newFriend, name: e.target.value })
              }
              placeholder="Введите имя"
              className="form-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Telegram username (опционально)
            </label>
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
              className="form-input"
            />
          </div>

          <div className="flex space-x-3">
            <button onClick={handleAddFriend} className="primary-button flex-1">
              Добавить
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewFriend({ name: "", telegramUsername: "" });
              }}
              className="secondary-button flex-1"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список друзей */}
      {friends.length > 0 ? (
        <div className="space-y-3">
          {friends.map(friend => (
            <div key={friend.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg font-medium">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {friend.name}
                    </div>
                    {friend.telegramUsername && (
                      <div className="text-sm text-gray-500">
                        @{friend.telegramUsername}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Добавлен {formatDate(friend.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {onCreateBill && (
                    <button
                      onClick={() => {
                        hapticFeedback.selection();
                        onCreateBill();
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Создать счет
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteFriend(friend.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3 className="empty-title">Нет друзей</h3>
          <p className="empty-description">
            Добавьте друзей для быстрого создания счетов
          </p>
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
        <div className="card mt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Всего друзей</div>
              <div className="text-2xl font-bold text-gray-900">
                {friends.length}
              </div>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>
      )}
    </div>
  );
};
