import React, { useState, useEffect } from "react";
import {
  TonConnectUIProvider,
  TonConnectButton,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import { useTelegram } from "../hooks/useTelegram";
import { userApi } from "../services/api";

interface TonWalletConnectProps {
  onWalletConnected?: (address: string) => void;
  onWalletDisconnected?: () => void;
}

const TonWalletContent: React.FC<TonWalletConnectProps> = ({
  onWalletConnected,
  onWalletDisconnected,
}) => {
  const [tonConnectUI] = useTonConnectUI();
  const { webApp } = useTelegram();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем, подключен ли уже кошелек
    const checkConnection = () => {
      if (tonConnectUI.account) {
        setIsConnected(true);
        setWalletAddress(tonConnectUI.account.address);
        onWalletConnected?.(tonConnectUI.account.address);
      } else {
        setIsConnected(false);
        setWalletAddress(null);
        onWalletDisconnected?.();
      }
    };

    checkConnection();

    // Подписываемся на изменения состояния подключения
    const unsubscribe = tonConnectUI.onStatusChange(wallet => {
      if (wallet && "account" in wallet) {
        setIsConnected(true);
        setWalletAddress(wallet.account.address);
        onWalletConnected?.(wallet.account.address);
        saveWalletAddress(wallet.account.address);
      } else {
        setIsConnected(false);
        setWalletAddress(null);
        onWalletDisconnected?.();
        removeWalletAddress();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI, onWalletConnected, onWalletDisconnected]);

  const saveWalletAddress = async (address: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await userApi.updateProfile({
        tonWalletAddress: address,
      });

      // Показываем уведомление об успехе
      if (webApp && "showAlert" in webApp) {
        (webApp as any).showAlert("Кошелек TON успешно подключен!");
      }
    } catch (err) {
      console.error("Ошибка при сохранении адреса кошелька:", err);
      setError("Не удалось сохранить адрес кошелька");
      if (webApp && "showAlert" in webApp) {
        (webApp as any).showAlert("Ошибка при сохранении адреса кошелька");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeWalletAddress = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await userApi.updateProfile({
        tonWalletAddress: null,
      });
    } catch (err) {
      console.error("Ошибка при удалении адреса кошелька:", err);
      setError("Не удалось удалить адрес кошелька");
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="ton-wallet-connect">
      <div className="wallet-header"></div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="wallet-content">
        {isConnected && walletAddress ? (
          <div className="wallet-connected">
            <div className="wallet-info">
              <div className="wallet-icon">💎</div>
              <div className="wallet-details">
                <div className="wallet-label">Подключенный кошелек</div>
                <div className="wallet-address">
                  {formatAddress(walletAddress)}
                </div>
              </div>
            </div>

            <button
              className="disconnect-button"
              onClick={() => tonConnectUI.disconnect()}
              disabled={isLoading}
            >
              {isLoading ? "Отключение..." : "Отключить"}
            </button>
          </div>
        ) : (
          <div className="wallet-disconnected">
            <div className="wallet-icon-large">💎</div>
            <p>Подключите кошелек для получения платежей</p>
            <TonConnectButton />
          </div>
        )}
      </div>

      <div className="wallet-benefits">
        <h4>Преимущества подключения кошелька:</h4>
        <ul>
          <li>💰 Получение платежей напрямую на ваш кошелек</li>
          <li>⚡ Быстрые транзакции в сети TON</li>
          <li>🔒 Безопасное хранение средств</li>
          <li>📱 Удобное управление через Telegram</li>
        </ul>
      </div>
    </div>
  );
};

const TonWalletConnect: React.FC<TonWalletConnectProps> = props => {
  return (
    <TonConnectUIProvider
      manifestUrl="/tonconnect-manifest.json"
      walletsListConfiguration={{
        includeWallets: [
          {
            appName: "tonwallet",
            name: "TON Wallet",
            imageUrl: "https://wallet.ton.org/assets/ui/qr-logo.png",
            aboutUrl:
              "https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd",
            universalLink: "https://wallet.ton.org/ton-connect",
            jsBridgeKey: "tonwallet",
            bridgeUrl: "https://bridge.tonapi.io/bridge",
            platforms: ["chrome", "android"],
          },
          {
            appName: "tonkeeper",
            name: "Tonkeeper",
            imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
            aboutUrl: "https://tonkeeper.com",
            universalLink: "https://app.tonkeeper.com/ton-connect",
            jsBridgeKey: "tonkeeper",
            bridgeUrl: "https://bridge.tonapi.io/bridge",
            platforms: ["ios", "android", "chrome", "firefox"],
          },
        ],
      }}
      actionsConfiguration={{
        twaReturnUrl: "https://t.me/your_bot",
      }}
    >
      <TonWalletContent {...props} />
    </TonConnectUIProvider>
  );
};

export default TonWalletConnect;
