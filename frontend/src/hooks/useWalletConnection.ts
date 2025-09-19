import { useState, useEffect } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { userApi } from "../services/api";

export interface WalletConnectionState {
  isConnected: boolean;
  walletAddress: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useWalletConnection = () => {
  const [tonConnectUI] = useTonConnectUI();
  const [state, setState] = useState<WalletConnectionState>({
    isConnected: false,
    walletAddress: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const checkConnection = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Проверяем подключение через TON Connect
        if (tonConnectUI.account) {
          const address = tonConnectUI.account.address;
          setState({
            isConnected: true,
            walletAddress: address,
            isLoading: false,
            error: null,
          });
          return;
        }

        // Если TON Connect не подключен, проверяем сохраненный адрес в профиле
        try {
          const response = await userApi.getMe();
          if (response.data?.success && response.data?.data?.tonWalletAddress) {
            setState({
              isConnected: true,
              walletAddress: response.data.data.tonWalletAddress,
              isLoading: false,
              error: null,
            });
            return;
          }
        } catch (error) {
          console.log("No saved wallet address found");
        }

        // Кошелек не подключен
        setState({
          isConnected: false,
          walletAddress: null,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState({
          isConnected: false,
          walletAddress: null,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    checkConnection();

    // Подписываемся на изменения состояния подключения
    const unsubscribe = tonConnectUI.onStatusChange(wallet => {
      if (wallet && "account" in wallet) {
        setState({
          isConnected: true,
          walletAddress: wallet.account.address,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          isConnected: false,
          walletAddress: null,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI]);

  const connectWallet = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Открываем модальное окно подключения кошелька
      await tonConnectUI.openModal();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to connect wallet",
      }));
    }
  };

  const disconnectWallet = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await tonConnectUI.disconnect();

      setState({
        isConnected: false,
        walletAddress: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to disconnect wallet",
      }));
    }
  };

  return {
    ...state,
    connectWallet,
    disconnectWallet,
  };
};
