import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SettingsService } from "./SettingsService.js";
import type { ICollection, IDatabase } from "./types/IDatabase.js";

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
    updateOne: async (_filter, update) => {
      const setFields = (update["$set"] ?? {}) as Record<string, unknown>;
      const key = setFields["key"] as string;
      data[key] = setFields["value"];
    },
    deleteOne: async () => {},
    countDocuments: async () => 0,
    createIndex: async () => {},
  };
  const db: IDatabase = {
    connect: async () => {},
    disconnect: async () => {},
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
});
