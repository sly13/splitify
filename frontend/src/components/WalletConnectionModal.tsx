import React, { useEffect } from "react";
import { TonConnectUIProvider, TonConnectButton, useTonConnectUI } from "@tonconnect/ui-react";
import { useTelegram } from "../hooks/useTelegram";

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletConnected?: (address: string) => void;
}

const WalletConnectionContent: React.FC<{
  onClose: () => void;
  onWalletConnected?: (address: string) => void;
}> = ({ onClose, onWalletConnected }) => {
  const { showSuccess } = useTelegram();
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    // Подписываемся на изменения состояния подключения
    const unsubscribe = tonConnectUI.onStatusChange(wallet => {
      if (wallet && "account" in wallet) {
        showSuccess("Кошелек успешно подключен!");
        onWalletConnected?.(wallet.account.address);
        onClose();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI, onWalletConnected, onClose, showSuccess]);

  return (
    <div className="wallet-connection-modal">
      <div className="modal-header">
        <h3>Подключение кошелька TON</h3>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="modal-body">
        <div className="wallet-info">
          <div className="wallet-icon">⚡</div>
          <h4>Для оплаты необходимо подключить кошелек TON</h4>
          <p>
            Подключите ваш кошелек TON (Tonkeeper, TON Wallet и др.) для
            совершения платежей в блокчейне TON.
          </p>
        </div>

        <div className="wallet-connect-section">
          <TonConnectButton />
        </div>

        <div className="wallet-help">
          <h5>Как подключить кошелек:</h5>
          <ol>
            <li>Нажмите кнопку "Connect Wallet"</li>
            <li>Выберите ваш кошелек TON</li>
            <li>Подтвердите подключение в кошельке</li>
            <li>Адрес кошелька автоматически сохранится</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
  onWalletConnected,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content wallet-modal"
        onClick={e => e.stopPropagation()}
      >
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
            twaReturnUrl: `https://t.me/${
              import.meta.env.VITE_TELEGRAM_BOT_NAME || "splitify_tg_bot"
            }`,
          }}
        >
          <WalletConnectionContent
            onClose={onClose}
            onWalletConnected={onWalletConnected}
          />
        </TonConnectUIProvider>
      </div>
    </div>
  );
};

export default WalletConnectionModal;
