import { paymentApi } from "./api";

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  paymentUrl?: string;
  invoiceUrl?: string;
  expiresAt: string;
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

class PaymentService {
  // Создание платежной сессии
  async createPaymentIntent(
    billId: string,
    amount: number,
    currency: string
  ): Promise<PaymentIntent> {
    try {
      const response = await paymentApi.createPayment({
        billId,
        amount,
        currency,
      });

      return response.data;
    } catch (error) {
      console.error("Error creating payment intent:", error);
      throw error;
    }
  }

  // Открытие платежной системы
  async openPayment(paymentIntent: PaymentIntent): Promise<PaymentResult> {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      throw new Error("Telegram WebApp not available");
    }

    try {
      if (paymentIntent.currency === "TON" && paymentIntent.paymentUrl) {
        // Для TON используем DeepLink
        return await this.openTONPayment(paymentIntent.paymentUrl);
      } else if (paymentIntent.invoiceUrl) {
        // Для USDT используем Telegram Invoice
        return await this.openUSDTInvoice(paymentIntent.invoiceUrl);
      } else {
        throw new Error("No payment method available");
      }
    } catch (error) {
      console.error("Error opening payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Открытие TON платежа через DeepLink
  private async openTONPayment(paymentUrl: string): Promise<PaymentResult> {
    return new Promise(resolve => {
      // Открываем DeepLink
      const link = document.createElement("a");
      link.href = paymentUrl;
      link.target = "_blank";
      link.click();

      // Устанавливаем таймаут для обработки результата
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: "Payment timeout",
        });
      }, 300000); // 5 минут

      // Слушаем сообщения от платежной системы
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === "TON_PAYMENT_RESULT") {
          clearTimeout(timeout);
          window.removeEventListener("message", handleMessage);

          resolve({
            success: event.data.success,
            transactionHash: event.data.transactionHash,
            error: event.data.error,
          });
        }
      };

      window.addEventListener("message", handleMessage);
    });
  }

  // Открытие USDT инвойса через Telegram
  private async openUSDTInvoice(invoiceUrl: string): Promise<PaymentResult> {
    // const tg = window.Telegram?.WebApp;

    // TODO: Implement Telegram invoice functionality
    console.log("Opening USDT invoice:", invoiceUrl);

    return new Promise(resolve => {
      // Placeholder implementation
      setTimeout(() => {
        resolve({
          success: false,
          error: "Invoice functionality not implemented yet",
        });
      }, 1000);
    });
  }

  // Подтверждение платежа
  async confirmPayment(
    paymentId: string,
    transactionHash: string
  ): Promise<void> {
    try {
      await paymentApi.confirmPayment(paymentId, transactionHash);
    } catch (error) {
      console.error("Error confirming payment:", error);
      throw error;
    }
  }

  // Проверка статуса платежа
  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      const response = await paymentApi.getPaymentStatus(paymentId);
      return response.data;
    } catch (error) {
      console.error("Error getting payment status:", error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
