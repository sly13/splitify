import "fastify";
import { authMiddleware } from "../middleware/auth";
import { adminAuthMiddleware } from "../middleware/adminAuth";

declare module "fastify" {
  interface FastifyInstance {
    authMiddleware: typeof authMiddleware;
    adminAuthMiddleware: typeof adminAuthMiddleware;
  }
  
  interface FastifyRequest {
    params: any;
  }
}
