import React, { useState } from "react";
import { useTelegram } from "../hooks/useTelegram";
import { useToast } from "../hooks/useToast";

interface WalletConnectProps {
  onWalletConnected?: (address: string) => void;
  onCancel?: () => void;
  className?: string;
}

const WalletConnect: React.FC<WalletConnectProps> = ({
  onWalletConnected,
  onCancel,
  className = "",
}) => {
  const { hapticFeedback } = useTelegram();
  const { showSuccess, showError } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      hapticFeedback.impact("medium");

      // Здесь будет логика подключения к TON кошельку
      // Пока что симулируем подключение
      await new Promise(resolve => setTimeout(resolve, 1000));

      // В реальном приложении здесь будет получение адреса кошелька
      const mockWalletAddress =
        "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH0";

      showSuccess("✅ Кошелек успешно подключен!");
      onWalletConnected?.(mockWalletAddress);
    } catch (error) {
      console.error("Ошибка подключения кошелька:", error);
      showError("❌ Ошибка подключения кошелька");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={`wallet-connect ${className}`}>
      <div className="wallet-connect-content">
        <div className="wallet-icon">💎</div>
        <h3>Подключить TON кошелек</h3>
        <p>
          Подключите свой TON кошелек для удобной оплаты счетов и получения
          платежей
        </p>

        <div className="wallet-connect-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleConnectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? "Подключение..." : "Подключить кошелек"}
          </button>

          {onCancel && (
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
              disabled={isConnecting}
            >
              Отмена
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
