import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";
import { useBillStore } from "../stores/billStore";
import { ParticipantStatus } from "../types/app";

const BillViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hapticFeedback, showError } = useTelegram();
  const { currentBill, fetchBill, isLoading } = useBillStore();

  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBill(id);
    }
  }, [id, fetchBill]);

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

  const paidAmount = currentBill.participants.reduce(
    (sum, p) => sum + (p.status === ParticipantStatus.PAID ? p.amount : 0),
    0
  );
  const progressPercentage = (paidAmount / currentBill.totalAmount) * 100;

  const currentUserParticipant = currentBill.participants.find(
    p => p.user.id === user?.id
  );

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

  const handleShare = () => {
    hapticFeedback.impact("medium");
    setShowShareModal(true);
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
        </div>
      </div>

      <div className="participants-section">
        <div className="section-header">
          <h2>Участники</h2>
          <button className="share-button" onClick={handleShare}>
            📤 Поделиться
          </button>
        </div>

        <div className="participants-table">
          {currentBill.participants.map(participant => (
            <div key={participant.id} className="participant-row">
              <div className="participant-info">
                <div className="participant-avatar">
                  {participant.user.photoUrl ? (
                    <img
                      src={participant.user.photoUrl}
                      alt={participant.user.firstName}
                    />
                  ) : (
                    <span>{participant.user.firstName[0]}</span>
                  )}
                </div>
                <div className="participant-details">
                  <div className="participant-name">
                    {participant.user.firstName} {participant.user.lastName}
                  </div>
                  {participant.user.username && (
                    <div className="participant-username">
                      @{participant.user.username}
                    </div>
                  )}
                </div>
              </div>

              <div className="participant-amount">
                {participant.amount} {currentBill.currency}
              </div>

              <div className="participant-status">
                <span className={`status-badge ${participant.status}`}>
                  {participant.status === ParticipantStatus.PENDING &&
                    "Ожидает"}
                  {participant.status === ParticipantStatus.CONFIRMED &&
                    "Подтверждено"}
                  {participant.status === ParticipantStatus.PAID && "Оплачено"}
                </span>
                {participant.status === ParticipantStatus.PAID && (
                  <div className="payment-time">
                    {new Date(participant.joinedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentUserParticipant &&
        currentUserParticipant.status !== ParticipantStatus.PAID && (
          <div className="payment-section">
            <div className="payment-card">
              <div className="payment-info">
                <h3>Ваша доля</h3>
                <div className="payment-amount">
                  {currentUserParticipant.amount} {currentBill.currency}
                </div>
              </div>
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
  // const { webApp } = useTelegram();
  const [qrCode, setQrCode] = useState<string>("");

  const shareUrl = `https://t.me/your_bot?startapp=bill_${billId}`;

  useEffect(() => {
    // TODO: Генерировать QR код
    import("qrcode").then(QRCode => {
      QRCode.toDataURL(shareUrl).then(url => {
        setQrCode(url);
      });
    });
  }, [shareUrl]);

  const handleShare = () => {
    // TODO: Implement Telegram share functionality
    console.log("Sharing:", shareUrl);
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

          {qrCode && (
            <div className="qr-code">
              <img src={qrCode} alt="QR код" />
              <p>Отсканируйте QR код</p>
            </div>
          )}

          <button className="telegram-share-button" onClick={handleShare}>
            📤 Поделиться в Telegram
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillViewPage;
