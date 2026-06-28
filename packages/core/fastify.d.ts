import type { preHandlerHookHandler } from "fastify";
import type { DatabaseService } from "../../db/src/DatabaseService.ts";
import type { RedisCacheService } from "../src/RedisCacheService.ts";
import type { Config } from "../src/ConfigService.ts";
import type { Logger } from "pino";

declare module "fastify" {
  interface FastifyInstance {
    /** MongoDB service — injected via app.decorate("db", ...) */
    db: DatabaseService;
    /** Redis cache service — injected via app.decorate("cache", ...) */
    cache: RedisCacheService;
    /** Validated environment config */
    config: Config;
    /** Pino logger instance */
    logger: Logger;
    /**
     * JWT authentication preHandler.
     * Sets request.user if token is valid, else replies 401.
     */
    authenticate: preHandlerHookHandler;
    /**
     * Permission-based access guard factory.
     * Returns a preHandler that replies 403 if user lacks the given permission.
     */
    checkPermission: (permission: string) => preHandlerHookHandler;
  }

  interface FastifyRequest {
    /** Set by the `authenticate` decorator after successful JWT verification. */
    user?: {
      id: string;
      email: string;
      role: string;
      permissions: string[];
    };
  }
}
