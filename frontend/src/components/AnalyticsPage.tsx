import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBillStore } from "../stores/billStore";
import { useTelegram } from "../hooks/useTelegram";
import { analyticsApi } from "../services/api";

interface AnalyticsData {
  stats: {
    totalBills: number;
    completedBills: number;
    activeBills: number;
    totalAmount: number;
    paidAmount: number;
    completionRate: number;
    remainingAmount: number;
  };
  friendsDebts: Array<{
    name: string;
    telegramUsername?: string;
    totalDebt: number;
    billsCount: number;
    bills: Array<{ id: string; title: string; amount: number }>;
  }>;
}

const AnalyticsPage: React.FC = () => {
  const { bills } = useBillStore();
  const { user, hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<{
    name: string;
    telegramUsername?: string;
    totalDebt: number;
    billsCount: number;
  } | null>(null);
  const [friendDebtsData, setFriendDebtsData] = useState<{
    friendId: string;
    totalDebt: number;
    debts: Array<{
      billId: string;
      billTitle: string;
      amount: number;
      currency: string;
      createdAt: string;
      status: string;
    }>;
  } | null>(null);
  const [isLoadingFriendDebts, setIsLoadingFriendDebts] = useState(false);

  // Вспомогательная функция для безопасного форматирования чисел
  const formatNumber = (value: unknown, decimals: number = 2): string => {
    if (value === null || value === undefined) {
      return "0.00";
    }
    const num = Number(value);
    return isNaN(num) ? "0.00" : num.toFixed(decimals);
  };

  // Подсчитываем статистику
  const totalBills = bills.length;
  const completedBills = bills.filter(
    bill => bill.status === "completed"
  ).length;
  const activeBills = bills.filter(bill => bill.status === "active").length;

  const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const paidAmount = bills.reduce((sum, bill) => {
    const paid = bill.participants.reduce(
      (participantSum, participant) =>
        participant.status === "paid"
          ? participantSum + (participant.amount ?? 0)
          : participantSum,
      0
    );
    return sum + paid;
  }, 0);

  const completionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Подсчитываем долги друзей
  const friendsDebts = React.useMemo(() => {
    const debtsMap = new Map<
      string,
      { name: string; totalDebt: number; billsCount: number }
    >();

    bills.forEach(bill => {
      bill.participants.forEach(participant => {
        // Пропускаем текущего пользователя
        if (participant.telegramUserId === user?.id?.toString()) {
          return;
        }

        // Пропускаем оплаченные доли
        if (participant.paymentStatus === "paid") {
          return;
        }

        const amount =
          parseFloat(participant.shareAmount || "0") ||
          (participant.amount ?? 0);
        if (amount <= 0) return;

        const key = participant.telegramUsername || participant.name;
        const existing = debtsMap.get(key);

        if (existing) {
          existing.totalDebt += amount;
          existing.billsCount += 1;
        } else {
          debtsMap.set(key, {
            name: participant.name,
            totalDebt: amount,
            billsCount: 1,
          });
        }
      });
    });

    return Array.from(debtsMap.values()).sort(
      (a, b) => b.totalDebt - a.totalDebt
    );
  }, [bills, user?.id]);

  // Функция для загрузки детальных данных о долгах друга
  const loadFriendDebts = async (friendId: string) => {
    try {
      setIsLoadingFriendDebts(true);
      const response = await analyticsApi.getFriendDebtsAnalytics(friendId);
      if (response.data?.success) {
        setFriendDebtsData(response.data.data);
      }
    } catch (err) {
      console.error("Ошибка загрузки долгов друга:", err);
    } finally {
      setIsLoadingFriendDebts(false);
    }
  };

  // Обработчик клика на друга
  const handleFriendClick = async (friend: {
    name: string;
    telegramUsername?: string;
    totalDebt: number;
    billsCount: number;
  }) => {
    setSelectedFriend(friend);
    const friendId = friend.telegramUsername || friend.name;
    await loadFriendDebts(friendId);
  };

  // Обработчик клика на счет
  const handleBillClick = (billId: string) => {
    hapticFeedback?.impact("light");
    setSelectedFriend(null); // Закрываем модальное окно
    navigate(`/bill/${billId}`);
  };

  // Загружаем данные аналитики с сервера
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await analyticsApi.getDebtsAnalytics();
        if (response.data?.success) {
          setAnalyticsData(response.data.data);
        } else {
          setError("Ошибка загрузки аналитики");
        }
      } catch (err) {
        console.error("Ошибка загрузки аналитики:", err);
        setError("Не удалось загрузить данные аналитики");
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  // Используем данные с сервера или fallback
  const stats = analyticsData?.stats || {
    totalBills: totalBills || 0,
    completedBills: completedBills || 0,
    activeBills: activeBills || 0,
    totalAmount: totalAmount || 0,
    paidAmount: paidAmount || 0,
    completionRate: completionRate || 0,
    remainingAmount: (totalAmount || 0) - (paidAmount || 0),
  };
  const serverFriendsDebts = analyticsData?.friendsDebts || [];
  const finalFriendsDebts =
    serverFriendsDebts.length > 0 ? serverFriendsDebts : friendsDebts;

  if (isLoading) {
    return (
      <div className="analytics-page">
        <div className="analytics-header">
          <h1>📊 Аналитика</h1>
          <p>Загрузка данных...</p>
        </div>
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Получение данных аналитики</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-header">
          <h1>📊 Аналитика</h1>
          <p>Ошибка загрузки</p>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>📊 Аналитика</h1>
        <p>Статистика ваших счетов</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalBills}</div>
            <div className="stat-label">Всего счетов</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.completedBills}</div>
            <div className="stat-label">Завершено</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.activeBills}</div>
            <div className="stat-label">Активных</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">
              {formatNumber(stats.completionRate, 1)}%
            </div>
            <div className="stat-label">Оплачено</div>
          </div>
        </div>
      </div>

      <div className="amount-summary">
        <div className="amount-item">
          <span className="amount-label">Общая сумма:</span>
          <span className="amount-value">
            {formatNumber(stats.totalAmount)} USDT
          </span>
        </div>
        <div className="amount-item">
          <span className="amount-label">Оплачено:</span>
          <span className="amount-value paid">
            {formatNumber(stats.paidAmount)} USDT
          </span>
        </div>
        <div className="amount-item">
          <span className="amount-label">Осталось:</span>
          <span className="amount-value pending">
            {formatNumber(stats.remainingAmount)} USDT
          </span>
        </div>
      </div>

      {finalFriendsDebts.length > 0 && (
        <div className="friends-debts-section">
          <h3>💸 Долги друзей</h3>
          <div className="debts-list">
            {finalFriendsDebts.map((friend, index) => (
              <div
                key={index}
                className="debt-item clickable"
                onClick={() => handleFriendClick(friend)}
              >
                <div className="debt-info">
                  <div className="debt-name">{friend.name}</div>
                  <div className="debt-details">
                    {friend.billsCount} счет
                    {friend.billsCount === 1
                      ? ""
                      : friend.billsCount < 5
                      ? "а"
                      : "ов"}
                  </div>
                </div>
                <div className="debt-amount">
                  {formatNumber(friend.totalDebt)} USDT
                </div>
                <div className="debt-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bills.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>Нет данных для анализа</h3>
          <p>Создайте первый счёт, чтобы увидеть статистику</p>
        </div>
      )}

      {/* Модальное окно с детальными долгами друга */}
      {selectedFriend && (
        <div className="modal-overlay" onClick={() => setSelectedFriend(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💸 Долги {selectedFriend.name}</h3>
              <button
                className="modal-close"
                onClick={() => setSelectedFriend(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="friend-summary">
                <div className="summary-item">
                  <span className="summary-label">Общий долг:</span>
                  <span className="summary-value">
                    {formatNumber(selectedFriend.totalDebt)} USDT
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Количество счетов:</span>
                  <span className="summary-value">
                    {selectedFriend.billsCount}
                  </span>
                </div>
              </div>

              {isLoadingFriendDebts ? (
                <div className="loading-state">
                  <div className="loading-spinner">⏳</div>
                  <p>Загрузка деталей...</p>
                </div>
              ) : friendDebtsData?.debts ? (
                <div className="debts-details">
                  <h4>Детали по счетам:</h4>
                  <div className="debts-list-detailed">
                    {friendDebtsData.debts.map((debt, index: number) => (
                      <div
                        key={index}
                        className="debt-detail-item clickable"
                        onClick={() => handleBillClick(debt.billId)}
                      >
                        <div className="debt-detail-info">
                          <div className="debt-detail-title">
                            {debt.billTitle}
                          </div>
                          <div className="debt-detail-status">
                            Статус:{" "}
                            {debt.status === "active" ? "Активный" : "Завершен"}
                          </div>
                          <div className="debt-detail-date">
                            Создан:{" "}
                            {new Date(debt.createdAt).toLocaleDateString(
                              "ru-RU"
                            )}
                          </div>
                        </div>
                        <div className="debt-detail-amount">
                          {formatNumber(debt.amount)} {debt.currency}
                        </div>
                        <div className="debt-detail-arrow">→</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-debts">
                  <p>Нет детальной информации о долгах</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
