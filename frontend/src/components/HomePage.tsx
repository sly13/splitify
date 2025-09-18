import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";
import { useBillStore } from "../stores/billStore";
import { BillStatus } from "../types/app";
import type { Bill, Participant } from "../types/app";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hapticFeedback } = useTelegram();
  const { bills, isLoading, fetchBills, deleteBill } = useBillStore();
  const [deleteModal, setDeleteModal] = useState<{
    billId: string;
    billTitle: string;
  } | null>(null);

  // Получаем текущий таб из URL параметров
  const currentTab = searchParams.get("tab") || "new";

  React.useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Очищаем URL параметры если нет валидного таба
  React.useEffect(() => {
    const validTabs = ["new", "in_progress", "completed"];
    if (!validTabs.includes(currentTab)) {
      setSearchParams({ tab: "new" });
    }
  }, [currentTab, setSearchParams]);

  // Определяем табы и их соответствие статусам
  const tabs = [
    { key: "new", label: "Новые", status: "new" },
    { key: "in_progress", label: "В процессе", status: "in_progress" },
    { key: "completed", label: "Завершены", status: "completed" },
  ];

  // Фильтруем счета по выбранному табу
  const filteredBills = bills.filter(bill => {
    if (currentTab === "new") {
      // Новые - открытые счета, где никто не оплатил
      return (
        bill.status === BillStatus.OPEN &&
        bill.participants.every(p => p.paymentStatus !== "paid")
      );
    } else if (currentTab === "in_progress") {
      // В процессе - открытые счета, где кто-то оплатил, но не все
      return (
        bill.status === BillStatus.OPEN &&
        bill.participants.some(p => p.paymentStatus === "paid") &&
        bill.participants.some(p => p.paymentStatus !== "paid")
      );
    } else if (currentTab === "completed") {
      // Завершены - закрытые счета или где все оплатили
      return (
        bill.status === BillStatus.CLOSED ||
        (bill.status === BillStatus.OPEN &&
          bill.participants.every(p => p.paymentStatus === "paid"))
      );
    }
    return true;
  });

  // Обработчик смены таба
  const handleTabChange = (tabKey: string) => {
    hapticFeedback.impact("light");
    setSearchParams({ tab: tabKey });
  };

  const handleCreateBill = () => {
    hapticFeedback.impact("medium");
    navigate("/create");
  };

  const handleBillClick = (billId: string) => {
    hapticFeedback.impact("medium");
    navigate(`/bill/${billId}`);
  };

  const handleDeleteClick = (
    e: React.MouseEvent,
    billId: string,
    billTitle: string
  ) => {
    e.stopPropagation();
    hapticFeedback.impact("medium");
    setDeleteModal({ billId, billTitle });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;

    try {
      hapticFeedback.impact("heavy");
      await deleteBill(deleteModal.billId);
      setDeleteModal(null);
    } catch (error) {
      console.error("Failed to delete bill:", error);
      // Ошибка уже обработана в store
    }
  };

  const handleCancelDelete = () => {
    hapticFeedback.impact("light");
    setDeleteModal(null);
  };

  // Проверяем, можно ли удалить счет (новый счет без платежей)
  const canDeleteBill = (bill: Bill) => {
    return (
      bill.status === BillStatus.OPEN &&
      bill.participants.every((p: Participant) => p.paymentStatus !== "paid")
    );
  };

  return (
    <div className="home-page">
      <div className="header">
        <h1>💰 Crypto Split Bill</h1>
        <p>Привет, {user?.first_name}! 👋</p>
        
        {/* Информация о сервере */}
        <div className="server-info">
          <details>
            <summary>🔧 Информация о сервере</summary>
            <div className="server-details">
              <p><strong>API URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'Не задан'}</p>
              <p><strong>Socket URL:</strong> {import.meta.env.VITE_SOCKET_URL || 'Не задан'}</p>
              <p><strong>Режим:</strong> {import.meta.env.DEV ? 'Разработка' : 'Продакшн'}</p>
              <p><strong>Тестовый режим:</strong> {import.meta.env.VITE_TEST_MODE === 'true' ? 'Включен' : 'Выключен'}</p>
            </div>
          </details>
        </div>
      </div>

      <div className="actions">
        <button className="primary-button" onClick={handleCreateBill}>
          📝 Создать счёт
        </button>
      </div>

      <div className="bills-section">
        <h2>Мои счета</h2>

        {/* Табы */}
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab ${currentTab === tab.key ? "active" : ""}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="loading">Загрузка...</div>
        ) : filteredBills.length === 0 ? (
          <div className="empty-state">
            <p>
              {currentTab === "new" && "У вас нет новых счетов"}
              {currentTab === "in_progress" && "У вас нет счетов в процессе"}
              {currentTab === "completed" && "У вас нет завершенных счетов"}
            </p>
            {currentTab === "new" && (
              <p>Создайте первый счёт или присоединитесь к существующему</p>
            )}
          </div>
        ) : (
          <div className="bills-list">
            {filteredBills.map(bill => (
              <div key={bill.id} className="bill-card">
                <div
                  className="bill-card-content"
                  onClick={() => handleBillClick(bill.id)}
                >
                  <div className="bill-info">
                    <h3>{bill.title}</h3>
                    <p>
                      {bill.totalAmount} {bill.currency}
                    </p>
                    <span className={`status ${bill.status}`}>
                      {bill.status}
                    </span>
                  </div>
                </div>
                {canDeleteBill(bill) && (
                  <button
                    className="delete-bill-btn"
                    onClick={e => handleDeleteClick(e, bill.id, bill.title)}
                    title="Удалить счет"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно подтверждения удаления */}
      {deleteModal && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Удалить счет?</h3>
              <button className="close-button" onClick={handleCancelDelete}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Вы уверены, что хотите удалить счет{" "}
                <strong>"{deleteModal.billTitle}"</strong>?
              </p>
              <p className="warning-text">
                ⚠️ Это действие нельзя отменить. Счет будет удален навсегда.
              </p>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={handleCancelDelete}
                >
                  Отмена
                </button>
                <button className="danger-button" onClick={handleConfirmDelete}>
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

export default HomePage;
