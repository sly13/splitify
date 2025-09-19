import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";
import { useBillStore } from "../stores/billStore";
import { useAuth } from "../contexts/AuthContext";
import { ParticipantStatus, type Participant } from "../types/app";
import { billApi, userApi } from "../services/api";

const BillViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hapticFeedback, showError, showSuccess, webApp } =
    useTelegram();
  const { currentBill, fetchBill, isLoading } = useBillStore();
  const { isAuthenticated } = useAuth();

  const [showShareModal, setShowShareModal] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Настройка Telegram BackButton
  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(() => {
        navigate(-1);
      });
    }

    return () => {
      if (webApp?.BackButton) {
        webApp.BackButton.hide();
        webApp.BackButton.offClick(() => {
          navigate(-1);
        });
      }
    };
  }, [webApp, navigate]);

  useEffect(() => {
    // Загружаем счет только после аутентификации
    if (id && isAuthenticated) {
      console.log("🔐 User authenticated, fetching bill...");
      fetchBill(id);
    }
  }, [id, isAuthenticated, fetchBill]);

  // Загружаем данные пользователя из API
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await userApi.getMe();
        if (response.data?.success && response.data?.data) {
          setUserData(response.data.data);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных пользователя:", error);
      }
    };

    loadUserData();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Загрузка счёта...</p>
      </div>
    );
  }

  if (!currentBill) {
    return (
      <div className="error-screen">
        <h2>Счёт не найден</h2>
        <button className="primary-button" onClick={() => navigate("/")}>
          Вернуться на главную
        </button>
      </div>
    );
  }

  const paidAmount = (currentBill.participants || []).reduce((sum, p) => {
    const isPaid = ((p as any).paymentStatus || p.status) === "paid";
    const amount = parseFloat((p as any).shareAmount || p.amount || "0");
    return sum + (isPaid ? amount : 0);
  }, 0);
  const progressPercentage = (paidAmount / currentBill.totalAmount) * 100;

  // Ищем текущего пользователя среди участников
  const currentUserParticipant = (currentBill.participants || []).find(p => {
    // Используем данные из API если доступны, иначе fallback на Telegram WebApp
    const currentUserId = userData?.id || user?.id;
    const currentUserTelegramId =
      userData?.telegramUserId || user?.id?.toString();
    const currentUsername = userData?.username || user?.username;

    // Проверяем по user.id (если участник зарегистрирован)
    if (p.user?.id && currentUserId) {
      return p.user.id.toString() === currentUserId.toString();
    }

    // Проверяем по telegramUserId (если участник не зарегистрирован)
    if (p.telegramUserId && currentUserTelegramId) {
      return p.telegramUserId === currentUserTelegramId;
    }

    // Проверяем по telegramUsername (если есть username)
    if (p.telegramUsername && currentUsername) {
      return p.telegramUsername === currentUsername;
    }

    return false;
  });

  // Отладочная информация
  console.log("🔍 Отладка пользователя в BillViewPage:");
  console.log("user (Telegram WebApp):", user);
  console.log("userData (API):", userData);
  console.log("currentBill.participants:", currentBill.participants);
  console.log("currentUserParticipant:", currentUserParticipant);
  console.log("isPayer:", currentUserParticipant?.isPayer);

  // Проверяем, является ли текущий пользователь создателем счёта
  const currentUserId = userData?.id || user?.id;
  const isCreator =
    currentUserId?.toString() === currentBill.creator?.id?.toString();

  const handlePayShare = async () => {
    if (!currentUserParticipant) {
      showError("Вы не являетесь участником этого счёта");
      return;
    }

    if (currentUserParticipant.status === ParticipantStatus.PAID) {
      showError("Вы уже оплатили свою долю");
      return;
    }

    hapticFeedback.impact("medium");

    try {
      // TODO: Создать платежную сессию
      const paymentIntent = await createPaymentIntent({
        billId: currentBill.id,
        amount: currentUserParticipant.amount,
        currency: currentBill.currency,
      });

      // Открыть платежную систему
      await openPayment(paymentIntent);
    } catch {
      showError("Ошибка при создании платежа");
    }
  };

  const handleMarkPayer = async (participantId: string, isPayer: boolean) => {
    if (!currentBill || !isCreator) {
      showError("Только создатель счёта может отмечать плательщика");
      return;
    }

    hapticFeedback.impact("medium");

    try {
      await billApi.markPayer(currentBill.id, participantId, isPayer);
      // Обновляем данные счёта
      await fetchBill(currentBill.id);
    } catch (error) {
      console.error("Error marking payer:", error);
      showError("Ошибка при обновлении статуса плательщика");
    }
  };

  const handleShareParticipant = async (participant: Participant) => {
    if (!currentBill || !participant.telegramUserId) {
      showError("Нельзя поделиться с этим участником");
      return;
    }

    hapticFeedback.impact("medium");

    try {
      // Создаем ссылку на приложение с параметром startapp
      const appUrl = `https://t.me/your_bot?startapp=bill_${currentBill.id}`;

      // Отправляем сообщение через Telegram Bot API
      const response = await fetch(
        `/api/bills/${currentBill.id}/send-to-participant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantId: participant.id,
            telegramUserId: participant.telegramUserId,
            appUrl,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showSuccess(`Ссылка отправлена ${participant.name}!`);
      } else {
        showError(result.error || "Ошибка при отправке сообщения");
      }
    } catch (error) {
      console.error("Error sharing with participant:", error);
      showError("Ошибка при отправке сообщения");
    }
  };

  const createPaymentIntent = async (data: unknown) => {
    // TODO: Реализовать API вызов для создания платежной сессии
    console.log("Creating payment intent:", data);
    return { id: "payment_123", url: "ton://transfer/..." };
  };

  const openPayment = async (paymentIntent: unknown) => {
    // TODO: Реализовать открытие платежной системы
    console.log("Opening payment:", paymentIntent);
  };

  return (
    <div className="bill-view-page">
      <div className="bill-header">
        <div className="bill-title">
          <h1>{currentBill.title}</h1>
          <p className="bill-description">{currentBill.description}</p>
        </div>

        <div className="bill-summary">
          <div className="total-amount">
            <span className="amount">{currentBill.totalAmount}</span>
            <span className="currency">{currentBill.currency}</span>
          </div>

          <div className="progress-section">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="progress-text">
              Оплачено: {paidAmount} {currentBill.currency} из{" "}
              {currentBill.totalAmount} {currentBill.currency}
            </div>
          </div>

          {/* Адрес кошелька для всех участников */}
          {(currentBill as any).creatorWalletAddress && (
            <div className="wallet-address-section">
              <div className="wallet-label">
                💳 Адрес кошелька для перевода:
              </div>
              <div className="wallet-address">
                {(currentBill as any).creatorWalletAddress}
              </div>
              <button
                className="copy-address-button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    (currentBill as any).creatorWalletAddress
                  );
                  showSuccess?.("Адрес скопирован в буфер обмена!");
                }}
              >
                📋 Скопировать адрес
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="participants-section">
        <div className="section-header">
          <h2>Участники</h2>
        </div>

        <div className="participants-table">
          {(currentBill.participants || [])
            .sort((a, b) => {
              // Сначала плательщик (isPayer: true) всегда идет первым
              if (a.isPayer && !b.isPayer) return -1;
              if (!a.isPayer && b.isPayer) return 1;

              // Если оба плательщики или оба не плательщики, сортируем по статусу оплаты
              const aStatus = (a as any).paymentStatus || a.status;
              const bStatus = (b as any).paymentStatus || b.status;

              // Если один оплатил, а другой нет - оплативший идет первым
              if (aStatus === "paid" && bStatus !== "paid") return -1;
              if (aStatus !== "paid" && bStatus === "paid") return 1;

              // Если оба в одном статусе - сортируем по имени
              const aName = a.user?.firstName || a.name;
              const bName = b.user?.firstName || b.name;
              return aName.localeCompare(bName, "ru");
            })
            .map(participant => (
              <div
                key={participant.id}
                className={`participant-row ${
                  participant.isPayer ? "payer-row" : ""
                }`}
              >
                <div className="participant-info">
                  <div className="participant-avatar">
                    {participant.user?.photoUrl ? (
                      <img
                        src={participant.user.photoUrl}
                        alt={participant.user.firstName}
                      />
                    ) : (
                      <span>
                        {participant.user?.firstName?.[0] ||
                          participant.name[0]}
                      </span>
                    )}
                  </div>
                  <div className="participant-details">
                    <div className="participant-name">
                      {participant.user
                        ? `${participant.user.firstName} ${
                            participant.user.lastName || ""
                          }`
                        : participant.name}
                    </div>
                    {(participant.user?.username ||
                      participant.telegramUsername) && (
                      <div className="participant-username">
                        @
                        {participant.user?.username ||
                          participant.telegramUsername}
                      </div>
                    )}
                  </div>
                </div>

                <div className="participant-amount">
                  {(participant as any).shareAmount || participant.amount}{" "}
                  {currentBill.currency}
                </div>

                <div className="participant-status">
                  <span
                    className={`status-badge ${
                      (participant as any).paymentStatus || participant.status
                    }`}
                  >
                    {((participant as any).paymentStatus ||
                      participant.status) === "pending" &&
                      !participant.isPayer &&
                      "Ожидает"}
                    {((participant as any).paymentStatus ||
                      participant.status) === "confirmed" && "Подтверждено"}
                    {((participant as any).paymentStatus ||
                      participant.status) === "paid" && "Оплачено"}
                  </span>
                  {participant.isPayer && (
                    <span className="payer-badge">💳 Заплатил за всех</span>
                  )}
                  {((participant as any).paymentStatus ||
                    participant.status) === "paid" && (
                    <div className="payment-time">
                      {new Date(
                        participant.joinedAt || ""
                      ).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="participant-actions">
                  {isCreator && (
                    <button
                      className={`mark-payer-button ${
                        participant.isPayer ? "active" : ""
                      }`}
                      onClick={() =>
                        handleMarkPayer(participant.id, !participant.isPayer)
                      }
                      title={
                        participant.isPayer
                          ? "Снять отметку плательщика"
                          : "Отметить как плательщика"
                      }
                    >
                      {participant.isPayer ? "✅" : "💳"}
                    </button>
                  )}
                  {!participant.isPayer && (
                    <button
                      className="share-participant-button"
                      onClick={() => handleShareParticipant(participant)}
                      title="Поделиться с участником"
                    >
                      📤
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {currentUserParticipant &&
        ((currentUserParticipant as any).paymentStatus ||
          currentUserParticipant.status) !== "paid" &&
        !currentUserParticipant.isPayer && (
          <div className="payment-section">
            <div className="payment-card">
              <div className="payment-info">
                <h3>Ваша доля</h3>
                <div className="payment-amount">
                  {(currentUserParticipant as any).shareAmount ||
                    currentUserParticipant.amount}{" "}
                  {currentBill.currency}
                </div>
              </div>

              {/* Адрес кошелька для перевода */}
              {(currentBill as any).creatorWalletAddress && (
                <div className="wallet-address-section">
                  <div className="wallet-label">
                    💳 Адрес кошелька для перевода:
                  </div>
                  <div className="wallet-address">
                    {(currentBill as any).creatorWalletAddress}
                  </div>
                  <button
                    className="copy-address-button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        (currentBill as any).creatorWalletAddress
                      );
                      showSuccess?.("Адрес скопирован в буфер обмена!");
                    }}
                  >
                    📋 Скопировать адрес
                  </button>
                </div>
              )}

              <button className="pay-button" onClick={handlePayShare}>
                💳 Оплатить долю
              </button>
            </div>
          </div>
        )}

      {showShareModal && (
        <ShareModal
          billId={currentBill.id}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

// Компонент модалки для поделиться
const ShareModal: React.FC<{ billId: string; onClose: () => void }> = ({
  billId,
  onClose,
}) => {
  const { showSuccess, showError, hapticFeedback } = useTelegram();
  const { currentBill } = useBillStore();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [isSending, setIsSending] = useState(false);

  const shareUrl = `${window.location.origin}/bill/${billId}`;

  // Получаем участников с telegramUserId (исключая создателя)
  const participantsWithTelegram = (currentBill?.participants || []).filter(
    p =>
      p.telegramUserId &&
      p.telegramUserId !== currentBill?.creator?.id?.toString()
  );

  const handleParticipantToggle = (participantId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleSelectAll = () => {
    if (selectedParticipants.length === participantsWithTelegram.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(participantsWithTelegram.map(p => p.id));
    }
  };

  const handleSendMessages = async () => {
    if (selectedParticipants.length === 0) {
      showError("Выберите участников для отправки");
      return;
    }

    setIsSending(true);
    hapticFeedback.impact("medium");

    try {
      const response = await fetch(
        `/api/bills/${billId}/send-to-participants`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantIds: selectedParticipants,
            shareUrl,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showSuccess(result.message || "Сообщения отправлены!");
        onClose();
      } else {
        showError(result.error || "Ошибка при отправке сообщений");
      }
    } catch (error) {
      console.error("Error sending messages:", error);
      showError("Ошибка при отправке сообщений");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Поделиться счётом</h3>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="share-url">
            <input type="text" value={shareUrl} readOnly />
            <button onClick={() => navigator.clipboard.writeText(shareUrl)}>
              📋 Копировать
            </button>
          </div>

          {participantsWithTelegram.length > 0 && (
            <div className="participants-selection">
              <div className="selection-header">
                <h4>Отправить участникам:</h4>
                <button className="select-all-button" onClick={handleSelectAll}>
                  {selectedParticipants.length ===
                  participantsWithTelegram.length
                    ? "Снять все"
                    : "Выбрать всех"}
                </button>
              </div>

              <div className="participants-list">
                {participantsWithTelegram.map(participant => (
                  <div key={participant.id} className="participant-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={() => handleParticipantToggle(participant.id)}
                      />
                      <span className="participant-name">
                        {participant.name}
                        {participant.telegramUsername && (
                          <span className="username">
                            @{participant.telegramUsername}
                          </span>
                        )}
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              <button
                className="send-messages-button"
                onClick={handleSendMessages}
                disabled={isSending || selectedParticipants.length === 0}
              >
                {isSending
                  ? "Отправляем..."
                  : `📨 Отправить (${selectedParticipants.length})`}
              </button>
            </div>
          )}

          {participantsWithTelegram.length === 0 && (
            <div className="no-participants">
              <p>Нет участников с Telegram для отправки сообщений</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillViewPage;
