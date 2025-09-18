import React, { useState, useEffect } from "react";
import { ContactSelector } from "./ContactSelector";
import { UsernameInput } from "./UsernameInput";
import { useTelegram } from "../hooks/useTelegram";

interface Participant {
  id: string;
  name: string;
  telegramUsername?: string;
  telegramUserId?: string;
  shareAmount: string;
}

interface ParticipantAdderProps {
  participants: Participant[];
  onParticipantsChange: (participants: Participant[]) => void;
  totalAmount: number;
  splitType: "equal" | "custom";
}

export const ParticipantAdder: React.FC<ParticipantAdderProps> = ({
  participants,
  onParticipantsChange,
  totalAmount,
  splitType,
}) => {
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    telegramUsername: "",
    shareAmount: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { hapticFeedback } = useTelegram();

  // Загружаем предложения из истории друзей
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:4041/api";
        const response = await fetch(`${API_BASE_URL}/friends`, {
          headers: {
            "X-Telegram-Init-Data": window.Telegram?.WebApp?.initData || "",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const usernames =
            data.friends
              ?.filter((friend: any) => friend.telegramUsername)
              .map((friend: any) => `@${friend.telegramUsername}`) || [];
          setSuggestions(usernames);
        }
      } catch (error) {
        console.error("Ошибка загрузки предложений:", error);
      }
    };

    loadSuggestions();
  }, []);

  const handleContactSelect = (contact: any) => {
    setNewParticipant({
      name: contact.name,
      telegramUsername: contact.telegramUsername || "",
      shareAmount: "",
    });
    setShowAddForm(true);
  };

  const handleAddParticipant = () => {
    if (!newParticipant.name.trim()) {
      hapticFeedback.notification("error");
      return;
    }

    const participant: Participant = {
      id: Date.now().toString(),
      name: newParticipant.name.trim(),
      telegramUsername: newParticipant.telegramUsername.replace("@", ""),
      shareAmount: newParticipant.shareAmount || "0",
    };

    const updatedParticipants = [...participants, participant];

    // Если тип разделения "равномерно", пересчитываем суммы
    if (splitType === "equal") {
      const equalShare = totalAmount / updatedParticipants.length;
      updatedParticipants.forEach(p => {
        p.shareAmount = equalShare.toFixed(2);
      });
    }

    onParticipantsChange(updatedParticipants);

    // Сбрасываем форму
    setNewParticipant({
      name: "",
      telegramUsername: "",
      shareAmount: "",
    });
    setShowAddForm(false);

    hapticFeedback.notification("success");
  };

  const handleRemoveParticipant = (id: string) => {
    const updatedParticipants = participants.filter(p => p.id !== id);

    // Если тип разделения "равномерно", пересчитываем суммы
    if (splitType === "equal" && updatedParticipants.length > 0) {
      const equalShare = totalAmount / updatedParticipants.length;
      updatedParticipants.forEach(p => {
        p.shareAmount = equalShare.toFixed(2);
      });
    }

    onParticipantsChange(updatedParticipants);
    hapticFeedback.selection();
  };

  const calculateTotal = () => {
    return participants.reduce(
      (sum, p) => sum + parseFloat(p.shareAmount || "0"),
      0
    );
  };

  const isTotalValid = Math.abs(calculateTotal() - totalAmount) < 0.01;

  return (
    <div className="space-y-4">
      {/* Список участников */}
      <div className="space-y-2">
        {participants.map(participant => (
          <div
            key={participant.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {participant.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {participant.name}
                </div>
                {participant.telegramUsername && (
                  <div className="text-sm text-gray-500">
                    @{participant.telegramUsername}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                {participant.shareAmount} USDT
              </span>
              <button
                onClick={() => handleRemoveParticipant(participant.id)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Кнопка добавления участника */}
      {!showAddForm && (
        <div className="space-y-2">
          <ContactSelector
            onSelect={handleContactSelect}
            placeholder="Выберите из друзей"
            className="w-full"
          />

          <button
            onClick={() => setShowAddForm(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Добавить участника вручную
          </button>
        </div>
      )}

      {/* Форма добавления участника */}
      {showAddForm && (
        <div className="p-4 border border-gray-300 rounded-lg bg-white space-y-4">
          <h3 className="font-medium text-gray-900">Добавить участника</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя участника
            </label>
            <input
              type="text"
              value={newParticipant.name}
              onChange={e =>
                setNewParticipant({ ...newParticipant, name: e.target.value })
              }
              placeholder="Введите имя"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telegram username (опционально)
            </label>
            <UsernameInput
              value={newParticipant.telegramUsername}
              onChange={value =>
                setNewParticipant({
                  ...newParticipant,
                  telegramUsername: value,
                })
              }
              placeholder="Введите @username"
              suggestions={suggestions}
              className="w-full"
            />
          </div>

          {splitType === "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сумма к оплате (USDT)
              </label>
              <input
                type="number"
                step="0.01"
                value={newParticipant.shareAmount}
                onChange={e =>
                  setNewParticipant({
                    ...newParticipant,
                    shareAmount: e.target.value,
                  })
                }
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleAddParticipant}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Добавить
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Итоговая сумма */}
      <div className="p-3 bg-gray-100 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">Итого:</span>
          <span
            className={`font-bold ${
              isTotalValid ? "text-green-600" : "text-red-600"
            }`}
          >
            {calculateTotal().toFixed(2)} / {totalAmount.toFixed(2)} USDT
          </span>
        </div>
        {!isTotalValid && (
          <div className="text-sm text-red-600 mt-1">
            Сумма долей должна равняться общей сумме счета
          </div>
        )}
      </div>
    </div>
  );
};
