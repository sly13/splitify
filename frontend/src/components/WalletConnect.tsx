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

  return (
    <div className={`wallet-connect ${className}`}>
      <TonWalletConnect
        onWalletConnected={handleWalletConnected}
        onWalletDisconnected={handleWalletDisconnected}
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
