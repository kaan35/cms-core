import process from "node:process";
import { ConfigService, LogService, RedisCacheService, createServer } from "@cms/core";
import type { LogLevel } from "@cms/core";
import { DatabaseService } from "@cms/db";

const env = process.env;
const config = new ConfigService(env);
const logger = new LogService(config.getOrDefault('LOG_LEVEL', 'info') as LogLevel);

const db = new DatabaseService(
  config.get('MONGO_URI'),
  config.getOrDefault('MONGO_DB_NAME', 'cms'),
  logger
);
await db.connect();

const cache = new RedisCacheService(config.get('REDIS_URL'), logger);
await cache.connect();

const app = await createServer(db, cache, env);

await app.listen({
  port: config.getInt('PORT', 3001),
  host: config.getOrDefault('HOST', '0.0.0.0'),
});

logger.info('Server listening', {
  port: config.getInt('PORT', 3001),
  host: config.getOrDefault('HOST', '0.0.0.0'),
});
