import React, { useState, useEffect } from "react";
import { useTelegram } from "../hooks/useTelegram";
import CustomSelect from "./CustomSelect";
import { friendsApi } from "../services/api";

interface Friend {
  id: string;
  name: string;
  telegramUsername?: string;
}

interface FriendsSelectProps {
  onSelect: (friend: Friend) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  excludeParticipants?: Array<{
    telegramUsername?: string;
    telegramUserId?: string;
  }>;
  friends?: Friend[]; // Передаем список друзей извне
}

export const FriendsSelect: React.FC<FriendsSelectProps> = ({
  onSelect,
  placeholder = "Выберите друга",
  className = "",
  disabled = false,
  excludeParticipants = [],
  friends: externalFriends,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { hapticFeedback, user } = useTelegram();

  // Используем переданных друзей или загружаем их
  useEffect(() => {
    if (externalFriends) {
      // Используем переданных друзей
      setFriends(externalFriends);
      setIsLoading(false);
    } else {
      // Загружаем друзей самостоятельно
      const loadFriends = async () => {
        try {
          setIsLoading(true);

          const response = await friendsApi.getFriends();
          setFriends(response.data.friends || []);
        } catch (error: any) {
          console.error("❌ FriendsSelect: Ошибка загрузки друзей:", error);
          console.error(
            "❌ FriendsSelect: Детали ошибки:",
            error.response?.data || error.message
          );
        } finally {
          setIsLoading(false);
        }
      };

      loadFriends();
    }
  }, [externalFriends]);

  // Добавляем себя в список друзей, если его там нет
  const allFriends = [...friends];
  if (
    user &&
    !friends.some(friend => friend.telegramUsername === user.username)
  ) {
    allFriends.unshift({
      id: `self_${user.id}`,
      name: `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}`,
      telegramUsername: user.username || undefined,
    });
  }

  // Фильтруем друзей, исключая уже выбранных участников
  const availableFriends = allFriends.filter(friend => {
    if (!friend.telegramUsername) {
      return true; // Если у друга нет username, оставляем его
    }

    const isExcluded = excludeParticipants.some(
      participant =>
        participant.telegramUsername === friend.telegramUsername ||
        (user &&
          participant.telegramUserId === user.id.toString() &&
          friend.telegramUsername === user.username)
    );

    return !isExcluded;
  });

  // Преобразуем доступных друзей в формат для CustomSelect
  const selectOptions = availableFriends.map(friend => ({
    value: friend.id,
    label: friend.name,
    icon: friend.id.startsWith("self_") ? "👑" : "👤", // Корона для себя
    friend: friend, // Сохраняем полную информацию о друге
  }));

  const handleSelect = (friendId: string) => {
    hapticFeedback.selection();
    const selectedFriend = allFriends.find(friend => friend.id === friendId);
    if (selectedFriend) {
      onSelect(selectedFriend);
    }
  };

  if (isLoading) {
    return (
      <div className={`friends-select loading ${className}`}>
        <div className="select-trigger">
          <div className="select-value">
            <span className="option-icon">⏳</span>
            <span className="option-label">Загрузка друзей...</span>
          </div>
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className={`friends-select empty ${className}`}>
        <div className="select-trigger disabled">
          <div className="select-value">
            <span className="option-icon">👥</span>
            <span className="option-label">Нет друзей</span>
          </div>
        </div>
        <div className="empty-message">
          <p>У вас пока нет друзей в списке</p>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            Добавьте участника вручную при создании счета, и он автоматически
            станет другом
          </p>
        </div>
      </div>
    );
  }

  if (availableFriends.length === 0) {
    return null; // Просто скрываем компонент, если нет доступных друзей
  }

  return (
    <div className={`friends-select ${className}`}>
      <CustomSelect
        options={selectOptions}
        value=""
        onChange={handleSelect}
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* Дополнительная информация о друге */}
      <div className="friends-info">
        <div className="friends-count">
          👥 {availableFriends.length} из {allFriends.length}{" "}
          {availableFriends.length === 1
            ? "друг"
            : availableFriends.length < 5
            ? "друга"
            : "друзей"}{" "}
          доступно
        </div>
      </div>
    </div>
  );
};

export default FriendsSelect;
