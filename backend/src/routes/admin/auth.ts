import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function adminAuthRoutes(fastify: FastifyInstance) {
  // Логин админа
  fastify.post("/admin/login", async (request, reply) => {
    try {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      if (!username || !password) {
        return reply
          .status(400)
          .send({ error: "Имя пользователя и пароль обязательны" });
      }

      const admin = await prisma.admin.findUnique({
        where: { username },
      });

      if (!admin) {
        return reply.status(401).send({ error: "Неверные учетные данные" });
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return reply.status(401).send({ error: "Неверные учетные данные" });
      }

      const token = jwt.sign(
        { adminId: admin.id, username: admin.username },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      return reply.send({
        token,
        admin: {
          id: admin.id,
          username: admin.username,
        },
      });
    } catch (error) {
      console.error("Ошибка при входе админа:", error);
      return reply.status(500).send({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Проверка токена
  fastify.get("/admin/verify", async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return reply.status(401).send({ error: "Токен не предоставлен" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;

      return reply.send({
        valid: true,
        admin: {
          id: decoded.adminId,
          username: decoded.username,
        },
      });
    } catch (error) {
      return reply.status(401).send({ error: "Недействительный токен" });
    }
  });
}
