import "@fastify/cookie";
import "@fastify/rate-limit";
import "@fastify/swagger";
import type { HookManager } from "../services/HookManager.js";
import type { PluginLoader } from "../services/PluginLoader.js";
import type { AuthUser } from "./auth.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    checkPermission: (
      permission: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyCsrf: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    setAuthMiddlewares: (middlewares: {
      authenticate?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
      checkPermission?: (
        permission: string,
      ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
      verifyCsrf?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }) => void;
    pluginLoader: PluginLoader;
    hooks: HookManager;
  }

  interface FastifyRequest {
    user?: AuthUser;
  }
}

export type {};
