import { FastifyInstance } from "fastify";
import { WebSocketMessage } from "../types";

interface WebSocketClient {
  send: (data: string) => void;
  room?: string;
}

declare module "fastify" {
  interface FastifyInstance {
    websocketServer?: {
      clients: Set<WebSocketClient>;
    };
  }
}

export async function setupWebSocket(fastify: FastifyInstance) {
  await fastify.register(require("@fastify/websocket"));

  const clients = new Set<WebSocketClient>();

  fastify.websocketServer = { clients };

  fastify.register(async function (fastify) {
    fastify.get("/ws/:billId", { websocket: true }, (connection, req) => {
      const billId = (req.params as any).billId;

      // Добавляем клиента в комнату
      const client: WebSocketClient = {
        send: (data: string) => {
          try {
            connection.socket.send(data);
          } catch (error) {
            console.error("Error sending WebSocket message:", error);
          }
        },
        room: `bill_${billId}`,
      };

      clients.add(client);

      connection.socket.on("message", message => {
        try {
          const data = JSON.parse(message.toString());
          console.log("WebSocket message received:", data);

          // Здесь можно добавить логику обработки входящих сообщений
          // Например, ping/pong для поддержания соединения
          if (data.type === "ping") {
            client.send(JSON.stringify({ type: "pong" }));
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      connection.socket.on("close", () => {
        clients.delete(client);
        console.log(`WebSocket client disconnected from bill ${billId}`);
      });

      connection.socket.on("error", error => {
        console.error("WebSocket error:", error);
        clients.delete(client);
      });

      console.log(`WebSocket client connected to bill ${billId}`);
    });
  });
}

export function broadcastToBill(
  billId: string,
  message: WebSocketMessage,
  fastify: FastifyInstance
) {
  if (!fastify.websocketServer) return;

  const messageStr = JSON.stringify(message);
  const room = `bill_${billId}`;

  fastify.websocketServer.clients.forEach(client => {
    if (client.room === room) {
      try {
        client.send(messageStr);
      } catch (error) {
        console.error("Error broadcasting to client:", error);
      }
    }
  });
}
