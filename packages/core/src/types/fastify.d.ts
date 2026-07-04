import type { preHandlerHookHandler } from "fastify";
import type { Logger } from "pino";
import type { Config } from "../ConfigService.ts";
import type { IDatabase } from "./IDatabase.ts";
import type { ICache } from "./ICache.ts";

declare module "fastify" {
  interface FastifyInstance {
    /** MongoDB service — injected via app.decorate("db", ...) */
    db: IDatabase;
    /** Redis cache service — injected via app.decorate("cache", ...) */
    cache: ICache;
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
    /** Cookies parsed by @fastify/cookie plugin */
    cookies: {
      token?: string;
      [key: string]: string | undefined;
    };
  }

  interface FastifyReply {
    /** Set cookie via @fastify/cookie plugin */
    setCookie(
      name: string,
      value: string,
      options?: {
        path?: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
        maxAge?: number;
        expires?: Date;
        domain?: string;
      }
    ): this;
    /** Clear cookie via @fastify/cookie plugin */
    clearCookie(name: string, options?: { path?: string; domain?: string }): this;
  }
}
