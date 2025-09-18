import React, { useState, useEffect } from "react";
import { UsernameInput } from "./UsernameInput";
import { useTelegram } from "../hooks/useTelegram";
import FriendsSelect from "./FriendsSelect";

interface Participant {
  id: string;
  name: string;
  telegramUsername?: string;
  telegramUserId?: string;
  shareAmount: string;
  isPayer?: boolean;
}

interface Friend {
  id: string;
  name: string;
  telegramUsername?: string;
}

interface ParticipantAdderProps {
  participants: Participant[];
  onParticipantsChange: (participants: Participant[]) => void;
  totalAmount: number;
  splitType: "equal" | "custom";
  onSplitTypeChange: (splitType: "equal" | "custom") => void;
  currency: string;
  friends?: Friend[]; // Передаем список друзей извне
  payerError?: string; // Ошибка валидации плательщика
}

// Функция для равномерного распределения суммы - каждый получает одинаковую сумму, округленную в большую сторону
const distributeAmountEqually = (
  totalAmount: number,
  participantCount: number
): string[] => {
  if (participantCount === 0) return [];

  // Делим сумму поровну и округляем в большую сторону до сотых
  const equalAmount = Math.ceil((totalAmount / participantCount) * 100) / 100;

  // Все участники получают одинаковую сумму
  return Array(participantCount).fill(equalAmount.toFixed(2));
};

export const ParticipantAdder: React.FC<ParticipantAdderProps> = ({
  participants,
  onParticipantsChange,
  totalAmount,
  splitType,
  onSplitTypeChange,
  currency,
  friends = [],
  payerError,
}) => {
  const { user } = useTelegram();
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    telegramUsername: "",
    shareAmount: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Логирование для отладки
  console.log("🔍 ParticipantAdder получил участников:", participants);
  console.log("📊 Количество участников:", participants.length);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { hapticFeedback } = useTelegram();

  // Генерируем предложения из переданных друзей
  useEffect(() => {
    const usernames =
      friends
        ?.filter((friend: Friend) => friend.telegramUsername)
        .map((friend: Friend) => `@${friend.telegramUsername}`) || [];
    setSuggestions(usernames);
  }, [friends]);

  // Автоматически пересчитываем суммы при изменении типа разделения или общей суммы
  useEffect(() => {
    if (splitType === "equal" && participants.length > 0 && totalAmount > 0) {
      const distributedAmounts = distributeAmountEqually(
        totalAmount,
        participants.length
      );
      const updatedParticipants = participants.map((p, index) => ({
        ...p,
        shareAmount: distributedAmounts[index],
      }));

      // Проверяем, изменились ли суммы, чтобы избежать бесконечного цикла
      const hasChanges = updatedParticipants.some(
        (p, index) => p.shareAmount !== participants[index].shareAmount
      );

      if (hasChanges) {
        onParticipantsChange(updatedParticipants);
      }
    }
  }, [splitType, totalAmount, participants.length, onParticipantsChange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Автоматически добавляем себя при первом рендере, если себя еще нет
  useEffect(() => {
    if (user && participants.length === 0) {
      // Проверяем, есть ли уже себя в списке участников
      const isSelfAlreadyAdded = participants.some(
        p => p.telegramUserId === user.id.toString()
      );

      if (!isSelfAlreadyAdded) {
        const selfParticipant: Participant = {
          id: `self_${user.id}`,
          name: `${user.first_name}${
            user.last_name ? ` ${user.last_name}` : ""
          }`,
          telegramUsername: user.username || undefined,
          telegramUserId: user.id.toString(),
          shareAmount: "0",
        };

        const updatedParticipants = [selfParticipant];

        // Если режим "равномерно" и есть общая сумма, рассчитываем долю
        if (splitType === "equal" && totalAmount > 0) {
          const equalShare = totalAmount / updatedParticipants.length;
          updatedParticipants.forEach(p => {
            p.shareAmount = equalShare.toFixed(2);
          });
        }

        onParticipantsChange(updatedParticipants);
      }
    }
  }, [user, participants, splitType, totalAmount, onParticipantsChange]);

  const handleContactSelect = (contact: Friend) => {
    // Проверяем, не добавлен ли уже этот участник
    const isAlreadyAdded = participants.some(
      p =>
        p.telegramUsername === contact.telegramUsername ||
        (user &&
          p.telegramUserId === user.id.toString() &&
          contact.telegramUsername === user.username)
    );

    if (isAlreadyAdded) {
      hapticFeedback.notification("error");
      return;
    }

    // Сразу добавляем участника без формы подтверждения
    const participant: Participant = {
      id: contact.id.startsWith("self_") ? contact.id : Date.now().toString(),
      name: contact.name,
      telegramUsername: contact.telegramUsername || undefined,
      telegramUserId: contact.id.startsWith("self_")
        ? user?.id.toString()
        : undefined,
      shareAmount: "0",
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
    hapticFeedback.notification("success");
  };

  const handleAddParticipant = () => {
    if (!newParticipant.name.trim()) {
      hapticFeedback.notification("error");
      return;
    }

    const participant: Participant = {
      id: Date.now().toString(),
      name: newParticipant.name.trim(),
      telegramUsername: newParticipant.telegramUsername
        ? newParticipant.telegramUsername.replace("@", "").trim()
        : undefined,
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

    console.log("🔄 Добавляем участника:", participant);
    console.log("📋 Обновленный список участников:", updatedParticipants);

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
      const distributedAmounts = distributeAmountEqually(
        totalAmount,
        updatedParticipants.length
      );
      updatedParticipants.forEach((p, index) => {
        p.shareAmount = distributedAmounts[index];
      });
    }

    onParticipantsChange(updatedParticipants);
    hapticFeedback.selection();
  };

  const handlePayerChange = (participantId: string, isPayer: boolean) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        return { ...p, isPayer };
      } else if (isPayer) {
        // Если отмечаем кого-то как плательщика, снимаем отметку с остальных
        return { ...p, isPayer: false };
      }
      return p;
    });

    onParticipantsChange(updatedParticipants);
    hapticFeedback.selection();
  };

  const handleAmountChange = (participantId: string, newAmount: string) => {
    // Если режим "равномерно" и пользователь начал изменять сумму вручную,
    // переключаем на режим "неравный"
    if (splitType === "equal") {
      onSplitTypeChange("custom");
    }

    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        return { ...p, shareAmount: newAmount };
      }
      return p;
    });

    onParticipantsChange(updatedParticipants);
  };

  const handleEqualSplit = () => {
    if (participants.length === 0 || totalAmount <= 0) return;

    const distributedAmounts = distributeAmountEqually(
      totalAmount,
      participants.length
    );
    const updatedParticipants = participants.map((p, index) => ({
      ...p,
      shareAmount: distributedAmounts[index],
    }));

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
      {participants.length > 0 && (
        <div className="participants-list">
          <div className="participants-header">
            <div className="participants-count">
              {participants.length}{" "}
              {participants.length === 1
                ? "участник"
                : participants.length < 5
                ? "участника"
                : "участников"}
            </div>
            {splitType === "custom" && participants.length > 1 && (
              <button
                onClick={handleEqualSplit}
                className="equal-split-button"
                title="Разделить поровну"
              >
                ⚖️ Равномерно
              </button>
            )}
          </div>
          {participants.map(participant => {
            console.log("🎨 Рендерим участника:", participant);
            const isSelf =
              user && participant.telegramUserId === user.id.toString();
            return (
              <div
                key={participant.id}
                className={`participant-item ${
                  isSelf ? "self-participant" : ""
                }`}
              >
                <div className="participant-info">
                  <div className="participant-avatar">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="participant-details">
                    <h4>
                      {participant.name}
                      {isSelf && <span className="self-badge"> (Вы)</span>}
                    </h4>
                    {participant.telegramUsername && (
                      <p>@{participant.telegramUsername}</p>
                    )}
                  </div>
                </div>
                <div className="participant-amount-section">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={participant.shareAmount || "0"}
                    onChange={e =>
                      handleAmountChange(participant.id, e.target.value)
                    }
                    className="amount-input"
                    placeholder="0.00"
                    disabled={splitType === "equal"}
                    title={
                      splitType === "equal"
                        ? "Сумма рассчитывается автоматически"
                        : "Введите сумму"
                    }
                  />
                  <span className="currency-label">{currency}</span>
                </div>
                <div className="participant-actions">
                  <label className="payer-checkbox">
                    <input
                      type="checkbox"
                      checked={participant.isPayer || false}
                      onChange={e =>
                        handlePayerChange(participant.id, e.target.checked)
                      }
                      title="Отметить как плательщика за весь счёт"
                    />
                    <span className="checkbox-label">💳 Платил</span>
                  </label>
                  <button
                    onClick={() => handleRemoveParticipant(participant.id)}
                    className="remove-participant"
                    title="Удалить участника"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Кнопка добавления участника */}
      {!showAddForm && (
        <div className="add-participant-section">
          <FriendsSelect
            onSelect={handleContactSelect}
            placeholder="Выберите из друзей"
            excludeParticipants={participants}
            friends={friends}
          />

          <button
            onClick={() => setShowAddForm(true)}
            className="add-manual-button"
          >
            + Добавить участника вручную
          </button>
        </div>
      )}

      {/* Форма добавления участника */}
      {showAddForm && (
        <div className="participant-form">
          <h3>Добавить участника</h3>

          <div className="form-group">
            <label>Имя участника</label>
            <input
              type="text"
              value={newParticipant.name}
              onChange={e =>
                setNewParticipant({ ...newParticipant, name: e.target.value })
              }
              placeholder="Введите имя"
            />
          </div>

          <div className="form-group">
            <label>Telegram username (опционально)</label>
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
            />
          </div>

          {splitType === "custom" && (
            <div className="form-group">
              <label>Сумма к оплате ({currency})</label>
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
              />
            </div>
          )}

          <div className="form-actions">
            <button onClick={handleAddParticipant} className="primary-button">
              Добавить
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="secondary-button"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Итоговая сумма */}
      <div className="total-summary">
        <div className="total-row">
          <span className="total-label">Итого:</span>
          <span
            className={`total-amount ${isTotalValid ? "valid" : "invalid"}`}
          >
            {calculateTotal().toFixed(2)} / {totalAmount.toFixed(2)} {currency}
          </span>
        </div>
        {!isTotalValid && (
          <div className="total-error">
            Сумма долей должна равняться общей сумме счета
          </div>
        )}
      </div>

      {/* Информация о плательщике и долгах */}
      {participants.some(p => p.isPayer) && (
        <div className="payer-info-section">
          <h4>💳 Информация о платежах</h4>
          {participants.map(participant => {
            if (participant.isPayer) {
              const othersDebt = participants
                .filter(p => !p.isPayer)
                .reduce((sum, p) => sum + parseFloat(p.shareAmount || "0"), 0);

              return (
                <div key={participant.id} className="payer-info">
                  <div className="payer-details">
                    <strong>{participant.name}</strong> заплатил за весь счёт
                  </div>
                  <div className="debt-info">
                    Остальные участники должны ему:{" "}
                    <strong>
                      {othersDebt.toFixed(2)} {currency}
                    </strong>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Ошибка валидации плательщика */}
      {payerError && (
        <div className="payer-error-section">
          <div className="error-message">
            ⚠️ {payerError}
          </div>
          <div className="payer-hint">
            Отметьте галочкой "💳 Платил" у того участника, кто заплатил за счёт
          </div>
        </div>
      )}
    </div>
  );
};
