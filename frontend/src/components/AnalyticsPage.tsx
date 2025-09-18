import React from "react";
import { useBillStore } from "../stores/billStore";

const AnalyticsPage: React.FC = () => {
  const { bills } = useBillStore();

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
          ? participantSum + participant.amount
          : participantSum,
      0
    );
    return sum + paid;
  }, 0);

  const completionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

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
            <div className="stat-number">{totalBills}</div>
            <div className="stat-label">Всего счетов</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{completedBills}</div>
            <div className="stat-label">Завершено</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{activeBills}</div>
            <div className="stat-label">Активных</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">{completionRate.toFixed(1)}%</div>
            <div className="stat-label">Оплачено</div>
          </div>
        </div>
      </div>

      <div className="amount-summary">
        <div className="amount-item">
          <span className="amount-label">Общая сумма:</span>
          <span className="amount-value">{totalAmount.toFixed(2)} USDT</span>
        </div>
        <div className="amount-item">
          <span className="amount-label">Оплачено:</span>
          <span className="amount-value paid">
            {paidAmount.toFixed(2)} USDT
          </span>
        </div>
        <div className="amount-item">
          <span className="amount-label">Осталось:</span>
          <span className="amount-value pending">
            {(totalAmount - paidAmount).toFixed(2)} USDT
          </span>
        </div>
      </div>

      {bills.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>Нет данных для анализа</h3>
          <p>Создайте первый счёт, чтобы увидеть статистику</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
