import { type FC } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";

const ErrorPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hapticFeedback } = useTelegram();

  const billId = searchParams.get("billId");
  const errorCode = searchParams.get("error");
  const errorMessage = searchParams.get("message");

  const handleRetry = () => {
    hapticFeedback.impact("medium");
    if (billId) {
      navigate(`/bill/${billId}`);
    } else {
      navigate("/");
    }
  };

  const handleBackToHome = () => {
    hapticFeedback.impact("medium");
    navigate("/");
  };

  return (
    <div className="error-page">
      <div className="error-content">
        <div className="error-icon">
          <div className="icon-container">
            <span className="icon">❌</span>
          </div>
        </div>

        <div className="error-text">
          <h1>Ошибка платежа</h1>
          <p className="error-message">
            {errorMessage || "Произошла ошибка при обработке платежа."}
          </p>
          {errorCode && (
            <div className="error-code">
              Код ошибки: <code>{errorCode}</code>
            </div>
          )}
        </div>

        <div className="error-actions">
          <button className="primary-button" onClick={handleRetry}>
            Попробовать снова
          </button>
          <button className="secondary-button" onClick={handleBackToHome}>
            Вернуться на главную
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
