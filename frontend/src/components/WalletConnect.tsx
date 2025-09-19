import React from "react";
import { useTelegram } from "../hooks/useTelegram";
import { useToast } from "../hooks/useToast";
import TonWalletConnect from "./TonWalletConnect";

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
  const { showSuccess } = useToast();

  const handleWalletConnected = (address: string) => {
    hapticFeedback.impact("medium");
    showSuccess("✅ Кошелек успешно подключен!");
    onWalletConnected?.(address);
  };

  const handleWalletDisconnected = () => {
    // Можно добавить логику при отключении кошелька
  };

  // Закрываем модальное окно при клике на Connect Wallet
  const handleConnectClick = () => {
    // Небольшая задержка, чтобы пользователь видел начало процесса
    setTimeout(() => {
      onCancel?.();
    }, 500);
  };

  return (
    <div className={`wallet-connect ${className}`}>
      <TonWalletConnect
        onWalletConnected={handleWalletConnected}
        onWalletDisconnected={handleWalletDisconnected}
        onConnectStart={handleConnectClick}
      />

      {onCancel && (
        <div className="wallet-connect-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Отмена
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
