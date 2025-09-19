import axios from "axios";
import { prisma } from "../config/database";

interface TonTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  comment?: string;
  timestamp: number;
}

interface TonApiResponse {
  transactions: TonTransaction[];
}

export class TonBlockchainService {
  private readonly TON_API_URL = "https://tonapi.io/v2";
  private readonly TON_API_KEY = process.env.TON_API_KEY;

  /**
   * Мониторинг транзакций для конкретного адреса кошелька
   */
  async monitorWalletTransactions(
    walletAddress: string
  ): Promise<TonTransaction[]> {
    try {
      const response = await axios.get<TonApiResponse>(
        `${this.TON_API_URL}/accounts/${walletAddress}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${this.TON_API_KEY}`,
            Accept: "application/json",
          },
          params: {
            limit: 10,
            sort: "desc",
          },
        }
      );

      return response.data.transactions || [];
    } catch (error) {
      console.error("Error fetching TON transactions:", error);
      // Возвращаем пустой массив вместо выброса ошибки для стабильности
      return [];
    }
  }

  /**
   * Проверка конкретной транзакции по хешу
   */
  async getTransactionByHash(txHash: string): Promise<TonTransaction | null> {
    try {
      const response = await axios.get<TonTransaction>(
        `${this.TON_API_URL}/blockchain/transactions/${txHash}`,
        {
          headers: {
            Authorization: `Bearer ${this.TON_API_KEY}`,
            Accept: "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching transaction by hash:", error);
      return null;
    }
  }

  /**
   * Поиск платежей по комментарию (bill ID)
   */
  async findPaymentsByComment(
    billId: string,
    walletAddress: string
  ): Promise<TonTransaction[]> {
    try {
      const transactions = await this.monitorWalletTransactions(walletAddress);

      return transactions.filter(
        tx =>
          tx.comment &&
          tx.comment.includes(`bill_${billId}`) &&
          tx.to === walletAddress // Входящие транзакции
      );
    } catch (error) {
      console.error("Error finding payments by comment:", error);
      return [];
    }
  }

  /**
   * Проверка и обновление статуса платежей
   */
  async checkAndUpdatePaymentStatus(paymentId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          bill: {
            include: {
              creator: true,
            },
          },
          participant: true,
        },
      });

      if (!payment || payment.status === "confirmed") {
        return false;
      }

      // Получаем адрес кошелька создателя счета
      const creatorWalletAddress = payment.bill.creator?.tonWalletAddress;
      if (!creatorWalletAddress) {
        console.log(
          `No creator wallet address found for bill ${payment.billId}`
        );
        return false;
      }

      // Ищем транзакции с комментарием bill ID
      const billId = payment.billId;
      const matchingTransactions = await this.findPaymentsByComment(
        billId,
        creatorWalletAddress
      );

      if (matchingTransactions.length > 0) {
        const transaction = matchingTransactions[0]; // Берем последнюю

        // Проверяем сумму
        const expectedAmount = payment.amount;
        const receivedAmount = parseFloat(transaction.value) / 1000000000; // Конвертируем из nanoTON

        if (Math.abs(receivedAmount - expectedAmount) < 0.001) {
          // Допуск 0.001 TON
          // Обновляем статус платежа
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: "confirmed",
              // transactionHash: transaction.hash, // Поле пока не добавлено в схему
              completedAt: new Date(transaction.timestamp * 1000),
            },
          });

          // Обновляем статус участника
          await prisma.billParticipant.update({
            where: { id: payment.participantId },
            data: { paymentStatus: "paid" },
          });

          console.log(
            `Payment ${paymentId} confirmed with transaction ${transaction.hash}`
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking payment status:", error);
      return false;
    }
  }

  /**
   * Периодическая проверка всех ожидающих платежей
   */
  async checkAllPendingPayments(): Promise<void> {
    try {
      const pendingPayments = await prisma.payment.findMany({
        where: {
          status: { in: ["created", "pending"] },
          provider: "TON",
        },
        include: {
          bill: {
            include: {
              creator: true,
            },
          },
        },
      });

      console.log(`Checking ${pendingPayments.length} pending payments...`);

      for (const payment of pendingPayments) {
        await this.checkAndUpdatePaymentStatus(payment.id);
        // Небольшая задержка между проверками
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Error checking pending payments:", error);
    }
  }
}

export const tonBlockchainService = new TonBlockchainService();
