import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ICache } from "../types/ICache.js";

const store = new Map<string, string>();

const inMemoryStubCache: ICache = {
  get: async (key: string) => store.get(key) ?? null,
  set: async (key: string, value: string, _ttl?: number) => {
    store.set(key, value);
  },
  del: async (...keys: string[]) => {
    for (const k of keys) store.delete(k);
  },
  isAlive: async () => true,
  quit: async () => {},
  getJson: async <T>(key: string) => {
    const raw = store.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  },
  setJson: async (key: string, value: unknown, _ttl?: number) => {
    store.set(key, JSON.stringify(value));
  },
  getOrSet: async <T>(key: string, factory: () => Promise<T>, _ttl?: number) => {
    const raw = store.get(key);
    if (raw) return JSON.parse(raw) as T;
    const fresh = await factory();
    store.set(key, JSON.stringify(fresh));
    return fresh;
  },
};

describe("ICache contract", () => {
  it("get returns null for unknown keys", async () => {
    assert.equal(await inMemoryStubCache.get("missing_key_xyz"), null);
  });

  it("set and del operate correctly", async () => {
    await inMemoryStubCache.set("k1", "v1");
    assert.equal(await inMemoryStubCache.get("k1"), "v1");
    await inMemoryStubCache.del("k1");
    assert.equal(await inMemoryStubCache.get("k1"), null);
  });

  it("getOrSet caches factory results transparently", async () => {
    let callCount = 0;
    const factory = async () => {
      callCount++;
      return { theme: "dark", count: 42 };
    };

    const first = await inMemoryStubCache.getOrSet("cfg:theme", factory);
    assert.deepEqual(first, { theme: "dark", count: 42 });
    assert.equal(callCount, 1);

    const second = await inMemoryStubCache.getOrSet("cfg:theme", factory);
    assert.deepEqual(second, { theme: "dark", count: 42 });
    assert.equal(callCount, 1, "Factory should not be invoked on cache hit");
  });
});
