import { createClient } from "redis";
import type { ICache } from "../types/ICache.js";
import type { ILogger } from "../types/ILogger.js";

export class RedisCacheService implements ICache {
  private readonly logger: ILogger;
  private readonly client: ReturnType<typeof createClient>;

  constructor(url: string, logger: ILogger) {
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

  async isAlive(): Promise<boolean> {
    try {
      const res = await this.client.ping();
      return res === "PONG";
    } catch {
      return false;
    }
  }

  async quit(): Promise<void> {
    await this.client.quit();
    this.logger.info("Redis connection closed");
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn("Redis getJson parse error", { key, error: String(err) });
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.set(key, serialized, ttlSeconds);
    } catch (err) {
      this.logger.warn("Redis setJson error", { key, error: String(err) });
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await factory();
    if (fresh !== undefined) {
      await this.setJson(key, fresh, ttlSeconds);
    }
    return fresh;
  }
}
