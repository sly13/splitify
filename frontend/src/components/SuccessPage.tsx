import { type FC } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";

const SuccessPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hapticFeedback } = useTelegram();

  const billId = searchParams.get("billId");
  const amount = searchParams.get("amount");
  const currency = searchParams.get("currency");

  const handleBackToBill = () => {
    hapticFeedback.impact("medium");
    if (billId) {
      navigate(`/bill/${billId}`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="success-page">
      <div className="success-content">
        <div className="success-icon">
          <div className="icon-container">
            <span className="icon">✅</span>
          </div>
        </div>

        <div className="success-text">
          <h1>Оплата засчитана!</h1>
          <p className="success-message">
            Ваш платёж на сумму {amount} {currency} успешно обработан.
          </p>
          <p className="success-submessage">
            Статус обновится в реальном времени для всех участников.
          </p>
        </div>

        <div className="success-actions">
          <button className="primary-button" onClick={handleBackToBill}>
            Вернуться к счёту
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
