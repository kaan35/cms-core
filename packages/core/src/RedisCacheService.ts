import type { RedisClientType } from "redis";
import { createClient } from "redis";
import { config } from "./ConfigService.ts";
import { logger } from "./LogService.ts";
import type { ICache } from "./types/ICache.ts";
import type { ILogger } from "./types/ILogger.ts";

export class RedisCacheService implements ICache {
  private client: RedisClientType;
  private isConnected = false;
  private wasDisconnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private customLogger?: ILogger;

  constructor(redisUrl?: string, customLogger?: ILogger) {
    this.customLogger = customLogger;
    const log = this.customLogger ?? logger;

    this.client = createClient({
      url: redisUrl ?? config.REDIS_URL,
      socket: {
        // Disable the built-in reconnect strategy — we manage reconnect ourselves
        reconnectStrategy: false,
      },
    });

    this.client.on("error", () => {
      // Errors are expected when Redis is unavailable — silently mark as disconnected
      if (this.isConnected) {
        this.isConnected = false;
        this.wasDisconnected = true;
        log.warn("⚠️  Redis disconnected — operating without cache");
      }
      this.scheduleReconnect();
    });

    this.client.on("ready", () => {
      this.isConnected = true;
      if (this.wasDisconnected) {
        log.info("♻️  Redis reconnected — cache restored");
        this.wasDisconnected = false;
      } else {
        log.info("🚀 Connected to Redis");
      }
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.isConnected || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.isConnected) return;
      try {
        // Disconnect cleanly first so we can call connect() again
        await this.client.disconnect();
      } catch {
        // ignore
      }
      try {
        await this.client.connect();
      } catch {
        // Will trigger error event which calls scheduleReconnect again
      }
    }, 10_000); // Retry every 10 seconds
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch {
      (this.customLogger ?? logger).warn(
        "⚠️  Redis unavailable at startup — will retry in background",
      );
      this.scheduleReconnect();
    }
  }

  isAlive(): boolean {
    return this.isConnected;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch {
      this.isConnected = false;
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.isConnected) return;
    try {
      const data = typeof value === "string" ? value : JSON.stringify(value);
      await this.client.set(key, data, { EX: ttlSeconds });
    } catch {
      this.isConnected = false;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.del(key);
    } catch {
      this.isConnected = false;
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch {
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (!this.isConnected) return;
    await this.client.quit();
    this.isConnected = false;
  }
}

export const cache = new RedisCacheService();
