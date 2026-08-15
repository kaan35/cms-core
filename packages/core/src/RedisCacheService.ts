import { createClient } from "redis";
import type { ICache } from "./types/ICache.js";
import type { ILogger } from "./types/ILogger.js";

export class RedisCacheService implements ICache {
  private readonly url: string;
  private readonly logger: ILogger;
  private readonly client: ReturnType<typeof createClient>;

  constructor(url: string, logger: ILogger) {
    this.url = url;
    this.logger = logger;
    this.client = createClient({ url });
    this.client.on("error", (err: Error) => {
      this.logger.error("Redis error", { error: err.message });
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.logger.info("Connected to Redis");
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async quit(): Promise<void> {
    await this.client.quit();
    this.logger.info("Redis connection closed");
  }
}
