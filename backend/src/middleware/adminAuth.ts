import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AdminRequest extends FastifyRequest {
  admin?: {
    id: string;
    username: string;
  };
}

export async function adminAuthMiddleware(
  request: AdminRequest,
  reply: FastifyReply
) {
  try {
    const token = request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return reply.status(401).send({ error: "Токен не предоставлен" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    request.admin = {
      id: decoded.adminId,
      username: decoded.username,
    };
  } catch (error) {
    return reply.status(401).send({ error: "Недействительный токен" });
  }
}
