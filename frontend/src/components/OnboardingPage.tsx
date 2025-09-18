import { type FC } from "react";
import { useNavigate } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";
import { useAppStore } from "../stores/appStore";

const OnboardingPage: FC = () => {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { setHasSeenOnboarding } = useAppStore();

  const handleStart = () => {
    hapticFeedback.impact("medium");
    setHasSeenOnboarding(true);
    navigate("/home");
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-content">
        <div className="onboarding-icon">
          <div className="icon-container">
            <span className="icon">💰</span>
          </div>
        </div>

        <div className="onboarding-text">
          <h1>Crypto Split Bill</h1>
          <p className="subtitle">Разделяй счета в криптовалюте</p>

          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <span className="step-text">Создавай счёт</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span className="step-text">Делись ссылкой</span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span className="step-text">Друзья оплачивают долю</span>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <span className="step-text">Видишь статусы</span>
            </div>
          </div>
        </div>

        <div className="onboarding-actions">
          <button className="start-button" onClick={handleStart}>
            Начать
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
