import { io, type Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(billId: string) {
    if (this.socket?.connected) {
      this.disconnect();
    }

    const serverUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

    this.socket = io(serverUrl, {
      auth: {
        billId,
        // Добавляем Telegram данные для аутентификации
        telegramData: window.Telegram?.WebApp?.initData,
      },
    });

    this.socket.on("connect", () => {
      console.log("Socket connected");
      this.isConnected = true;

      // Присоединяемся к комнате счета
      this.socket?.emit("join-bill", billId);
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
      this.isConnected = false;
    });

    this.socket.on("connect_error", error => {
      console.error("Socket connection error:", error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Подписка на обновления статуса участников
  onParticipantUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("participant-updated", callback);
    }
  }

  // Подписка на обновления платежей
  onPaymentUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("payment-updated", callback);
    }
  }

  // Подписка на обновления счета
  onBillUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("bill-updated", callback);
    }
  }

  // Отписка от событий
  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.removeAllListeners(event);
      }
    }
  }

  // Отправка события
  emit(event: string, data?: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  get connected() {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
