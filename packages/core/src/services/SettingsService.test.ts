import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SettingsService } from "./SettingsService.js";
import type { ICollection, IDatabase } from "../types/IDatabase.js";

const stubLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

function makeDb(stored: Record<string, unknown> = {}): {
  db: IDatabase;
  data: Record<string, unknown>;
} {
  const data = { ...stored };
  const collection: ICollection<Record<string, unknown>> = {
    findOne: async (filter) => {
      const key = filter["key"] as string;
      if (key in data) return { key, value: data[key], updatedAt: new Date() };
      return null;
    },
    find: async () => [],
    insertOne: async () => {},
    insertMany: async () => {},
    updateOne: async (_filter, update) => {
      const setFields = (update["$set"] ?? {}) as Record<string, unknown>;
      const key = setFields["key"] as string;
      data[key] = setFields["value"];
    },
    updateMany: async () => ({ modifiedCount: 0 }),
    deleteOne: async () => {},
    deleteMany: async () => ({ deletedCount: 0 }),
    countDocuments: async () => 0,
    createIndex: async () => {},
  };
  const db: IDatabase = {
    connect: async () => {},
    disconnect: async () => {},
    isAlive: async () => true,
    collection: <T extends Record<string, unknown>>(): ICollection<T> =>
      collection as unknown as ICollection<T>,
  };
  return { db, data };
}

describe("SettingsService", () => {
  it("get() returns defaultValue when key does not exist", async () => {
    const { db } = makeDb();
    const svc = new SettingsService(db, stubLogger);
    const result = await svc.get("auth.registrationEnabled", true);
    assert.equal(result, true);
  });

  it("get() returns stored value when key exists", async () => {
    const { db } = makeDb({ "auth.registrationEnabled": false });
    const svc = new SettingsService(db, stubLogger);
    const result = await svc.get("auth.registrationEnabled", true);
    assert.equal(result, false);
  });

  it("set() persists a value retrievable by get()", async () => {
    const { db } = makeDb();
    const svc = new SettingsService(db, stubLogger);
    await svc.set("system.brand.color", "#ff0000");
    const result = await svc.get("system.brand.color", "#000000");
    assert.equal(result, "#ff0000");
  });

  it("set() is upsert — calling twice does not duplicate", async () => {
    const { db, data } = makeDb();
    const svc = new SettingsService(db, stubLogger);
    await svc.set("some.key", "first");
    await svc.set("some.key", "second");
    assert.equal(data["some.key"], "second");
  });

  it("uses cache.getOrSet and invalidates on set()", async () => {
    const { db } = makeDb({ "site.name": "Old Name" });
    const cacheMap = new Map<string, unknown>();
    let delCalled = false;

    const mockCache: import("../types/ICache.js").ICache = {
      get: async () => null,
      set: async () => {},
      del: async (k) => {
        delCalled = true;
        cacheMap.delete(k);
      },
      isAlive: async () => true,
      quit: async () => {},
      getJson: async () => null,
      setJson: async () => {},
      getOrSet: async (key, factory) => {
        if (cacheMap.has(key)) return cacheMap.get(key) as never;
        const fresh = await factory();
        cacheMap.set(key, fresh);
        return fresh as never;
      },
    };

    const mockConfig: import("../types/services.js").IConfigService = {
      get: (k) => (k === "CACHE_SETTINGS_TTL_SECONDS" ? "86400" : ""),
      getOrDefault: (_k, def) => def,
      getBoolean: () => false,
      getInt: (k, def) => (k === "CACHE_SETTINGS_TTL_SECONDS" ? 86400 : (def ?? 0)),
    };

    const svc = new SettingsService(db, stubLogger, mockCache, mockConfig);
    const val1 = await svc.get("site.name", "Default");
    assert.equal(val1, "Old Name");
    assert.equal(cacheMap.get("setting:site.name"), "Old Name");

    await svc.set("site.name", "New Name");
    assert.equal(delCalled, true);
    assert.equal(cacheMap.has("setting:site.name"), false);
  });

  it("throws when cache is enabled and CACHE_SETTINGS_TTL_SECONDS is missing from config", () => {
    const { db } = makeDb();
    const mockCache: import("../types/ICache.js").ICache = {
      get: async () => null,
      set: async () => {},
      del: async () => {},
      isAlive: async () => true,
      quit: async () => {},
      getJson: async () => null,
      setJson: async () => {},
      getOrSet: async (_k, factory) => factory(),
    };
    const emptyConfig: import("../types/services.js").IConfigService = {
      get: (k) => {
        throw new Error(`Missing required environment variable: ${k}`);
      },
      getOrDefault: (_k, def) => def,
      getBoolean: () => false,
      getInt: (k, def) => {
        if (def !== undefined) return def;
        throw new Error(`Missing required environment variable: ${k}`);
      },
    };

    assert.throws(
      () => new SettingsService(db, stubLogger, mockCache, emptyConfig),
      /Missing required environment variable: CACHE_SETTINGS_TTL_SECONDS/,
    );
  });
});
