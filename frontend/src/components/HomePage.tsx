import React from "react";
import { useNavigate } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";
import { useBillStore } from "../stores/billStore";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hapticFeedback } = useTelegram();
  const { bills, isLoading, fetchBills } = useBillStore();

  React.useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleCreateBill = () => {
    hapticFeedback.impact("medium");
    navigate("/create");
  };

  const handleJoinBill = () => {
    hapticFeedback.impact("medium");
    // TODO: Navigate to join bill page
  };

  const handleBillClick = (billId: string) => {
    hapticFeedback.impact("medium");
    navigate(`/bill/${billId}`);
  };

  return (
    <div className="home-page">
      <div className="header">
        <h1>💰 Crypto Split Bill</h1>
        <p>Привет, {user?.first_name}! 👋</p>
      </div>

      <div className="actions">
        <button className="primary-button" onClick={handleCreateBill}>
          📝 Создать счёт
        </button>

        <button className="secondary-button" onClick={handleJoinBill}>
          🔗 Присоединиться к счёту
        </button>
      </div>

      <div className="bills-section">
        <h2>Мои счета</h2>

        {isLoading ? (
          <div className="loading">Загрузка...</div>
        ) : bills.length === 0 ? (
          <div className="empty-state">
            <p>У вас пока нет счетов</p>
            <p>Создайте первый счёт или присоединитесь к существующему</p>
          </div>
        ) : (
          <div className="bills-list">
            {bills.map(bill => (
              <div
                key={bill.id}
                className="bill-card"
                onClick={() => handleBillClick(bill.id)}
              >
                <h3>{bill.title}</h3>
                <p>
                  {bill.totalAmount} {bill.currency}
                </p>
                <span className={`status ${bill.status}`}>{bill.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
