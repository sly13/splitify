import cron from "node-cron";
import { tonBlockchainService } from "./tonBlockchainService";

export class PaymentMonitorService {
  private isRunning = false;
  private cronTask: cron.ScheduledTask | null = null;

  /**
   * Запуск мониторинга платежей
   */
  startMonitoring(): void {
    if (this.isRunning) {
      console.log("Payment monitoring is already running");
      return;
    }

    console.log("Starting payment monitoring service...");

    // Проверяем каждые 30 секунд
    this.cronTask = cron.schedule("*/30 * * * * *", async () => {
      try {
        await tonBlockchainService.checkAllPendingPayments();
      } catch (error) {
        console.error("Error in payment monitoring:", error);
      }
    });

    // Более детальная проверка каждые 5 минут
    cron.schedule("*/5 * * * *", async () => {
      try {
        console.log("Running detailed payment check...");
        await tonBlockchainService.checkAllPendingPayments();
      } catch (error) {
        console.error("Error in detailed payment check:", error);
      }
    });

    this.isRunning = true;
    console.log("Payment monitoring service started");
  }

  /**
   * Остановка мониторинга
   */
  stopMonitoring(): void {
    if (!this.isRunning) {
      console.log("Payment monitoring is not running");
      return;
    }

    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
    this.isRunning = false;
    console.log("Payment monitoring service stopped");
  }

  /**
   * Ручная проверка конкретного платежа
   */
  async checkPayment(paymentId: string): Promise<boolean> {
    try {
      return await tonBlockchainService.checkAndUpdatePaymentStatus(paymentId);
    } catch (error) {
      console.error("Error checking payment manually:", error);
      return false;
    }
  }
}

export const paymentMonitorService = new PaymentMonitorService();
