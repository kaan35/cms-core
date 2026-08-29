import type { LogLevel } from "@cms/core";
import { ConfigService, LogService, RedisCacheService, createServer } from "@cms/core";
import { DatabaseService } from "@cms/db";
import process from "node:process";

const env = process.env;
const config = new ConfigService(env);
const logger = new LogService(config.getOrDefault("LOG_LEVEL", "info") as LogLevel);

const db = new DatabaseService(
  config.get("MONGO_URI"),
  config.getOrDefault("MONGO_DB_NAME", "cms"),
  logger,
);
await db.connect();

const cache = new RedisCacheService(config.get("REDIS_URL"), logger);
await cache.connect();

const app = await createServer(db, cache, env);

const apiPort = config.getInt("API_PORT", 3001);
const host = config.getOrDefault("HOST", "0.0.0.0");

await app.listen({
  port: apiPort,
  host: host,
});

logger.info("Server listening", {
  port: apiPort,
  host: host,
});
