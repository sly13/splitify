import Fastify from "fastify";
import cors from "@fastify/cors";
import { authMiddleware } from "./middleware/auth";
import { adminAuthMiddleware } from "./middleware/adminAuth";
import { billsRoutes } from "./routes/bills";
import { paymentsRoutes } from "./routes/payments";
import { friendsRoutes } from "./routes/friends";
import { adminAuthRoutes } from "./routes/admin/auth";
import { adminDataRoutes } from "./routes/admin/data";
import { adminFriendsRoutes } from "./routes/admin/friends";
import { testRoutes } from "./routes/test";
import { setupWebSocket } from "./websocket";

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  },
});

// Регистрируем middleware
fastify.decorate("authMiddleware", authMiddleware);
fastify.decorate("adminAuthMiddleware", adminAuthMiddleware);

// Настраиваем CORS
fastify.register(cors, {
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:4040", // фронтенд в Docker
    "http://localhost:4042", // админка в Docker
  ],
  credentials: true,
});

// Настраиваем WebSocket
fastify.register(setupWebSocket);

// Регистрируем маршруты
fastify.register(billsRoutes);
fastify.register(paymentsRoutes);
fastify.register(friendsRoutes);
fastify.register(adminAuthRoutes);
fastify.register(adminDataRoutes);
fastify.register(adminFriendsRoutes);
fastify.register(testRoutes);

// Базовый маршрут для проверки здоровья
fastify.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Обработка ошибок
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.validation) {
    return reply.status(400).send({
      error: "Validation error",
      details: error.validation,
    });
  }

  return reply.status(500).send({
    error: "Internal server error",
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await fastify.close();
    console.log("Server closed gracefully");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Запуск сервера
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3001");
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    console.log(`Server is running on http://${host}:${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
