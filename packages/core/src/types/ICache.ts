export interface ICache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  isAlive(): Promise<boolean>;
  quit(): Promise<void>;
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}
