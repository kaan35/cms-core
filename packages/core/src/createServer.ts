import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { ConfigService } from "./services/ConfigService.js";
import { AppError } from "./errors/AppError.js";
import { HookManager } from "./services/HookManager.js";
import type { LogLevel } from "./services/LogService.js";
import { LogService } from "./services/LogService.js";
import { coreMigrations } from "./migrations/index.js";
import { PluginLoader } from "./services/PluginLoader.js";
import { PLUGIN_MANIFEST } from "./pluginManifest.js";
import { RedirectsService } from "./services/RedirectsService.js";
import { SettingsService } from "./services/SettingsService.js";
import type { ICache } from "./types/ICache.js";
import type { IDatabase } from "./types/IDatabase.js";

export async function createServer(
  db: IDatabase,
  cache: ICache,
  env: Record<string, string | undefined> = process.env,
): Promise<FastifyInstance> {
  const config = new ConfigService(env);
  const logger = new LogService(config.getOrDefault("LOG_LEVEL", "info") as LogLevel);

  const hooks = new HookManager();
  const redirects = new RedirectsService(db, logger);
  const settings = new SettingsService(db, logger);

  const app = Fastify({
    trustProxy: true,
    logger: false,
  });

  await app.register(helmet);
  await app.register(cookie);

  const rateLimitMax = config.getInt("RATE_LIMIT_GLOBAL_MAX", 100);
  const rateLimitTimeWindow = config.getOrDefault("RATE_LIMIT_GLOBAL_TIME_WINDOW", "1 minute");

  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: rateLimitTimeWindow,
  });

  const allowedOriginsRaw = config.getOrDefault("CORS_ALLOWED_ORIGINS", "");
  const allowedOrigins = allowedOriginsRaw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if (!origin) {
        return cb(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  });

  app.get("/health", async (_request, reply) => {
    const [dbAlive, cacheAlive] = await Promise.all([
      db.isAlive().catch(() => false),
      cache.isAlive().catch(() => false),
    ]);
    const status = dbAlive && cacheAlive ? "ok" : "degraded";
    return reply.status(200).send({
      status,
      db: dbAlive ? "ok" : "down",
      cache: cacheAlive ? "ok" : "down",
    });
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    const errObj =
      typeof error === "object" && error !== null
        ? (error as { statusCode?: number; message?: string })
        : null;
    if (
      typeof errObj?.statusCode === "number" &&
      errObj.statusCode >= 400 &&
      errObj.statusCode < 500
    ) {
      return reply.status(errObj.statusCode).send({ error: errObj.message ?? "Client error" });
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Unhandled error", { error: message });
    return reply.status(500).send({ error: "Internal server error" });
  });

  const pluginLoader = new PluginLoader(db, logger, app, {
    config,
    logger,
    db,
    cache,
    hooks,
    redirects,
    settings,
  });

  await pluginLoader.loadAll(PLUGIN_MANIFEST, coreMigrations);

  const shutdown = async (): Promise<void> => {
    logger.info("Graceful shutdown initiated");
    await app.close();
    await db.disconnect();
    await cache.quit();
    logger.info("Graceful shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());

  return app;
}
