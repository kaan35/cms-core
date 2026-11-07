import type { ICache } from "../types/ICache.js";

interface CacheEntry {
  readonly value: string;
  readonly expiresAt?: number | undefined;
}

export class InMemoryCache implements ICache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  private isExpired(entry: CacheEntry): boolean {
    if (entry.expiresAt === undefined) return false;
    return this.now() >= entry.expiresAt;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined && ttlSeconds <= 0) {
      this.store.delete(key);
      return;
    }
    const expiresAt = ttlSeconds !== undefined ? this.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.store.delete(key);
    }
  }

  async isAlive(): Promise<boolean> {
    return true;
  }

  async quit(): Promise<void> {
    this.store.clear();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttlSeconds);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await factory();
    if (fresh !== undefined && fresh !== null) {
      await this.setJson(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  clear(): void {
    this.store.clear();
  }
}

export function createInMemoryCache(now?: () => number): InMemoryCache {
  return new InMemoryCache(now);
}
