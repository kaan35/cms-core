import type { RedisClientType } from "redis";
import { createClient } from "redis";
import { config } from "./ConfigService.ts";
import { logger } from "./LogService.ts";

export class RedisCacheService {
  private client: RedisClientType;
  private isConnected = false;
  private wasDisconnected = false;
  private lastErrorLogTime = 0;

  constructor() {
    this.client = createClient({ url: config.REDIS_URL });

    this.client.on("error", (err: any) => {
      this.isConnected = false;
      this.wasDisconnected = true;

      const now = Date.now();
      if (now - this.lastErrorLogTime > 10000) {
        const message = err.errors ? err.errors[0]?.message : err.message;
        logger.error({ message }, "Redis Client Error");
        this.lastErrorLogTime = now;
      }
    });

    this.client.on("ready", () => {
      this.isConnected = true;
      if (this.wasDisconnected) {
        logger.info("♻️ Redis Connection Recovered");
        this.wasDisconnected = false;
      } else {
        logger.info("🚀 Connected to Redis");
      }
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    try {
      await this.client.connect();
    } catch (error: any) {
      const message = error.errors ? error.errors[0]?.message : error.message;
      logger.error({ message }, "❌ Redis Connection Error");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (!this.isConnected) return;
    const data = typeof value === "string" ? value : JSON.stringify(value);
    await this.client.set(key, data, { EX: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await this.client.quit();
    this.isConnected = false;
  }
}

export const cache = new RedisCacheService();
