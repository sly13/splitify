import React, { useEffect } from "react";
import { TonConnectUIProvider, useTonConnectUI } from "@tonconnect/ui-react";
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
    console.log("WalletConnectionContent mounted, tonConnectUI:", tonConnectUI);

    // Подписываемся на изменения состояния подключения
    const unsubscribe = tonConnectUI.onStatusChange(wallet => {
      console.log("Wallet status changed:", wallet);
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
        <h3>Подключить кошелек</h3>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="modal-body">
        <div className="wallet-connect-section">
          <button
            className="connect-wallet-button"
            onClick={() => {
              console.log("Connect wallet button clicked");
              tonConnectUI.openModal();
            }}
            style={{
              backgroundColor: "#0088cc",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              width: "100%",
              maxWidth: "300px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>⚡</span>
            Connect Wallet
          </button>
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
