import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";
import { useBillStore } from "../stores/billStore";
import { useAuth } from "../contexts/AuthContext";
import { useAuthStore } from "../stores/authStore";
import {
  ParticipantStatus,
  type Participant,
  type PaymentIntent,
  type User,
} from "../types/app";
import { userApi } from "../services/api";
import { useWalletConnection } from "../hooks/useWalletConnection";
import WalletConnectionModal from "./WalletConnectionModal";

const BillViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hapticFeedback, showError, showSuccess, webApp } =
    useTelegram();
  const { currentBill, fetchBill, isLoading } = useBillStore();
  const { isAuthenticated } = useAuth();
  const authUser = useAuthStore(state => state.user);

  const [showShareModal, setShowShareModal] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Проверяем подключение кошелька
  const { isConnected: isWalletConnected } = useWalletConnection();

  // Настройка Telegram BackButton
  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(() => {
        // Проверяем, пришел ли пользователь по прямой ссылке (startapp)
        const startParam = (webApp?.initDataUnsafe as { start_param?: string })
          ?.start_param;

        if (startParam) {
          // Если пользователь пришел по прямой ссылке, идем на главную страницу
          navigate("/", { replace: true });
        } else {
          // Если пользователь пришел из приложения, возвращаемся назад
          navigate(-1);
        }
      });
    }

    return () => {
      if (webApp?.BackButton) {
        webApp.BackButton.hide();
        webApp.BackButton.offClick(() => {
          // Очищаем обработчик
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
    const isPaid = (p.paymentStatus || p.status) === "paid";
    const amount = parseFloat(p.shareAmount || p.amount?.toString() || "0");
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

    // Если кошелек не подключен, сразу открываем модальное окно подключения
    if (!isWalletConnected) {
      setShowWalletModal(true);
      return;
    }

    try {
      // Создаем платежную сессию
      const paymentIntent = await createPaymentIntent({
        billId: currentBill.id,
        amount:
          currentUserParticipant.shareAmount ||
          currentUserParticipant.amount?.toString() ||
          "0",
        currency: currentBill.currency,
      });

      // Открываем платежную систему
      await openPayment(paymentIntent);
    } catch (error) {
      console.error("Payment error:", error);
      showError("Ошибка при создании платежа");
    }
  };

  const handleShareParticipant = async (participant: Participant) => {
    if (!currentBill) {
      showError("Счет не найден");
      return;
    }

    hapticFeedback.impact("medium");

    // Создаем ссылку на приложение с параметром startapp
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || "splitify_tg_bot";
    const appUrl = `https://t.me/${botName}?startapp=bill_${currentBill.id}`;

    // Если у участника есть telegramUserId, пытаемся отправить через Telegram Bot API
    if (participant.telegramUserId) {
      try {
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
          return;
        } else {
          console.warn("Telegram API failed:", result.error);
          // Продолжаем показывать ссылку для копирования
        }
      } catch (error) {
        console.error("Error sending via Telegram API:", error);
        // Продолжаем показывать ссылку для копирования
      }
    }

    // Показываем модальное окно с ссылкой для копирования
    setShowShareModal(true);
  };

  const createPaymentIntent = async (data: {
    billId: string;
    amount: string;
    currency: string;
  }): Promise<PaymentIntent> => {
    try {
      const response = await fetch("/api/payments/intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billId: data.billId,
          amount: parseFloat(data.amount),
          currency: data.currency,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment intent");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error creating payment intent:", error);
      throw error;
    }
  };

  const openPayment = async (paymentIntent: PaymentIntent) => {
    try {
      if (paymentIntent.provider === "TON" && paymentIntent.deeplink) {
        // Для TON используем DeepLink
        const link = document.createElement("a");
        link.href = paymentIntent.deeplink;
        link.target = "_blank";
        link.click();

        showSuccess("Открываем кошелек TON для оплаты...");
      } else {
        showError("Платежная система недоступна");
      }
    } catch (error) {
      console.error("Error opening payment:", error);
      showError("Ошибка при открытии платежной системы");
    }
  };

  const handleWalletConnected = (address: string) => {
    console.log("Wallet connected:", address);
    showSuccess("Кошелек подключен! Теперь вы можете совершить платеж.");
    // После подключения кошелька можно автоматически попробовать оплату снова
    setTimeout(() => {
      handlePayShare();
    }, 1000);
  };

  const handleShare = () => {
    const tg = webApp;
    const user = authUser || userData;

    if (tg?.ready && user?.ref) {
      const url = `https://t.me/share/url?url=https://t.me/cs_cases_app_bot/join?startapp=${user.ref}`;
      tg.openTelegramLink(url);
    } else {
      showError("Функция поделиться недоступна");
    }
  };

  return (
    <div className="bill-view-page">
      <div className="bill-header">
        <div className="bill-title">
          <div className="bill-title-row">
            <h1>{currentBill.title}</h1>
            {webApp?.ready && (authUser?.ref || userData?.ref) && (
              <button
                className="share-button"
                onClick={handleShare}
                title="Поделиться приложением"
              >
                📤 Поделиться
              </button>
            )}
          </div>
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
          {currentBill.creatorWalletAddress && (
            <div className="wallet-address-section">
              <div className="wallet-label">
                💳 Адрес кошелька для перевода:
              </div>
              <div className="wallet-address">
                {currentBill.creatorWalletAddress}
              </div>
              <div className="wallet-actions">
                <button
                  className="copy-address-button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      currentBill.creatorWalletAddress!
                    );
                    showSuccess?.("Адрес скопирован в буфер обмена!");
                  }}
                >
                  📋 Скопировать адрес
                </button>
                <button
                  className="open-wallet-button"
                  onClick={() => {
                    const walletAddress = currentBill.creatorWalletAddress!;
                    const tonDeepLink = `ton://transfer/${walletAddress}`;
                    const link = document.createElement("a");
                    link.href = tonDeepLink;
                    link.target = "_blank";
                    link.click();
                    showSuccess?.("Открываем кошелек TON...");
                  }}
                >
                  ⚡ Открыть в кошельке
                </button>
              </div>
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
              const aStatus = a.paymentStatus || a.status;
              const bStatus = b.paymentStatus || b.status;

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

                {!participant.isPayer && (
                  <div className="participant-status">
                    <span
                      className={`status-badge ${
                        participant.paymentStatus || participant.status
                      }`}
                    >
                      {(participant.paymentStatus || participant.status) ===
                        "pending" &&
                        !participant.isPayer &&
                        "Ожидает"}
                      {(participant.paymentStatus || participant.status) ===
                        "confirmed" && "Подтверждено"}
                      {(participant.paymentStatus || participant.status) ===
                        "paid" && "Оплачено"}
                    </span>
                    {(participant.paymentStatus || participant.status) ===
                      "paid" && (
                      <div className="payment-time">
                        {new Date(
                          participant.joinedAt || ""
                        ).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
                {participant.isPayer && (
                  <span className="payer-badge">💳 Заплатил за всех</span>
                )}

                <div className="participant-amount">
                  {participant.shareAmount || participant.amount}{" "}
                  {currentBill.currency}
                </div>

                <div className="participant-actions">
                  {!participant.isPayer && (
                    <button
                      className="share-participant-button"
                      onClick={() => handleShareParticipant(participant)}
                      title="Поделиться с участником"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12549 15.0077 5.24819 15.0227 5.36777L8.09187 9.17071C7.30026 8.44454 6.20298 8 5 8C2.79086 8 1 9.79086 1 12C1 14.2091 2.79086 16 5 16C6.20298 16 7.30026 15.5555 8.09187 14.8293L15.0227 18.6322C15.0077 18.7518 15 18.8745 15 19C15 20.6569 16.3431 22 18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.797 16 15.6997 16.4445 14.9081 17.1707L7.97727 13.3678C7.99231 13.2482 8 13.1255 8 13C8 12.8745 7.99231 12.7518 7.97727 12.6322L14.9081 8.82929C15.6997 9.55546 16.797 10 18 10C19.6569 10 21 8.65685 21 7C21 5.34315 19.6569 4 18 4C16.3431 4 15 5.34315 15 7C15 7.12549 15.0077 7.24819 15.0227 7.36777L8.09187 11.1707C7.30026 10.4445 6.20298 10 5 10C2.79086 10 1 11.7909 1 14C1 16.2091 2.79086 18 5 18C6.20298 18 7.30026 17.5555 8.09187 16.8293L15.0227 20.6322C15.0077 20.7518 15 20.8745 15 21C15 22.6569 16.3431 24 18 24C19.6569 24 21 22.6569 21 21C21 19.3431 19.6569 18 18 18C16.797 18 15.6997 18.4445 14.9081 19.1707L7.97727 15.3678C7.99231 15.2482 8 15.1255 8 15C8 14.8745 7.99231 14.7518 7.97727 14.6322L14.9081 10.8293C15.6997 11.5555 16.797 12 18 12C19.6569 12 21 10.6569 21 9C21 7.34315 19.6569 6 18 6C16.3431 6 15 7.34315 15 9C15 9.12549 15.0077 9.24819 15.0227 9.36777L8.09187 13.1707C7.30026 12.4445 6.20298 12 5 12C2.79086 12 1 13.7909 1 16C1 18.2091 2.79086 20 5 20C6.20298 20 7.30026 19.5555 8.09187 18.8293L15.0227 22.6322C15.0077 22.7518 15 22.8745 15 23C15 24.6569 16.3431 26 18 26C19.6569 26 21 24.6569 21 23C21 21.3431 19.6569 20 18 20C16.797 20 15.6997 20.4445 14.9081 21.1707L7.97727 17.3678C7.99231 17.2482 8 17.1255 8 17C8 16.8745 7.99231 16.7518 7.97727 16.6322L14.9081 12.8293C15.6997 13.5555 16.797 14 18 14C19.6569 14 21 12.6569 21 11C21 9.34315 19.6569 8 18 8Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {currentUserParticipant &&
        (currentUserParticipant.paymentStatus ||
          currentUserParticipant.status) !== "paid" &&
        !currentUserParticipant.isPayer && (
          <div className="payment-section">
            <div className="payment-card">
              <div className="payment-info">
                <h3>Ваша доля</h3>
                <div className="payment-amount">
                  {currentUserParticipant.shareAmount ||
                    currentUserParticipant.amount}{" "}
                  {currentBill.currency}
                </div>
              </div>

              {/* Адрес кошелька для перевода */}
              {currentBill.creatorWalletAddress && (
                <div className="wallet-address-section">
                  <div className="wallet-label">
                    💳 Адрес кошелька для перевода:
                  </div>
                  <div className="wallet-address">
                    {currentBill.creatorWalletAddress}
                  </div>
                  <div className="wallet-actions">
                    <button
                      className="copy-address-button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          currentBill.creatorWalletAddress!
                        );
                        showSuccess?.("Адрес скопирован в буфер обмена!");
                      }}
                    >
                      📋 Скопировать адрес
                    </button>
                    <button
                      className="open-wallet-button"
                      onClick={() => {
                        const walletAddress = currentBill.creatorWalletAddress!;
                        const tonDeepLink = `ton://transfer/${walletAddress}`;
                        const link = document.createElement("a");
                        link.href = tonDeepLink;
                        link.target = "_blank";
                        link.click();
                        showSuccess?.("Открываем кошелек TON...");
                      }}
                    >
                      ⚡ Открыть в кошельке
                    </button>
                  </div>
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

      {showWalletModal && (
        <WalletConnectionModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onWalletConnected={handleWalletConnected}
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

  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || "splitify_tg_bot";
  const shareUrl = `https://t.me/${botName}?startapp=bill_${billId}`;

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
        </div>
      </div>
    </div>
  );
};

export default BillViewPage;
