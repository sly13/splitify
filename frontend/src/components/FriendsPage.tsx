import React, { useState, useEffect } from "react";
import { useTelegram } from "../hooks/useTelegram";
import { useAuth } from "../contexts/AuthContext";
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
  const [deleteModal, setDeleteModal] = useState<{
    friendId: string;
    friendName: string;
  } | null>(null);
  const { hapticFeedback, showAlert, showSuccess } = useTelegram();
  const { isAuthenticated } = useAuth();

  // Загружаем список друзей только после аутентификации
  useEffect(() => {
    if (isAuthenticated) {
      console.log("🔐 User authenticated, loading friends...");
      loadFriends();
    }
  }, [isAuthenticated]);

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
      const response = await friendsApi.addFriend({
        name: newFriend.name.trim(),
        telegramUsername: newFriend.telegramUsername.replace("@", ""),
      });

      setFriends(prev => [response.data.friend, ...prev]);
      setNewFriend({ name: "", telegramUsername: "" });
      setShowAddForm(false);
      hapticFeedback.notification("success");
      showSuccess("Друг добавлен!");
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Ошибка добавления друга";
      showAlert(errorMessage);
      console.error("Ошибка добавления друга:", err);
    }
  };

  const handleDeleteClick = (friendId: string, friendName: string) => {
    hapticFeedback.impact("medium");
    setDeleteModal({ friendId, friendName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;

    try {
      await friendsApi.deleteFriend(deleteModal.friendId);
      setFriends(prev =>
        prev.filter(friend => friend.id !== deleteModal.friendId)
      );
      setDeleteModal(null);
      hapticFeedback.notification("success");
    } catch (err: unknown) {
      const errorResponse = err as {
        response?: {
          data?: {
            error?: string;
            message?: string;
            billsCount?: number;
            bills?: Array<{ id: string; title: string; status: string }>;
          };
        };
      };

      const errorData = errorResponse?.response?.data;

      if (errorData?.billsCount && errorData.billsCount > 0) {
        // Показываем специальное сообщение о наличии активных счетов
        const billsList =
          errorData.bills?.map(bill => `"${bill.title}"`).join(", ") || "";
        const message = `Нельзя удалить друга. У вас есть активные счета: ${billsList}`;
        showAlert(message);
      } else {
        // Обычная ошибка
        const errorMessage =
          errorData?.error || errorData?.message || "Ошибка удаления друга";
        showAlert(errorMessage);
      }

      setDeleteModal(null);
      console.error("Ошибка удаления друга:", err);
    }
  };

  const handleCancelDelete = () => {
    hapticFeedback.impact("light");
    setDeleteModal(null);
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
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewFriend({ name: "", telegramUsername: "" });
              }}
              className="secondary-button"
            >
              Отмена
            </button>
            <button onClick={handleAddFriend} className="primary-button">
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* Список друзей */}
      {friends.length > 0 ? (
        <div className="friends-section">
          <h2>Мои друзья ({friends.length})</h2>
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
                    onClick={() => handleDeleteClick(friend.id, friend.name)}
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

      {/* Модальное окно подтверждения удаления */}
      {deleteModal && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Удалить друга?</h3>
              <button className="close-button" onClick={handleCancelDelete}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Вы уверены, что хотите удалить{" "}
                <strong>{deleteModal.friendName}</strong> из списка друзей?
              </p>
              <div className="warning-text">
                ⚠️ Если у вас есть активные счета с этим другом, удаление будет
                невозможно.
              </div>
              <div className="modal-actions">
                <button
                  onClick={handleCancelDelete}
                  className="secondary-button"
                >
                  Отмена
                </button>
                <button onClick={handleConfirmDelete} className="danger-button">
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
