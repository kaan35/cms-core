import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RedirectsService } from "./RedirectsService.js";
import type { ICollection, IDatabase } from "../types/IDatabase.js";

const stubLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

function makeDb(docs: Array<Record<string, unknown>> = []): IDatabase {
  const data = [...docs];
  const collection: ICollection<Record<string, unknown>> = {
    findOne: async (filter) => data.find((d) => d["from"] === filter["from"]) ?? null,
    find: async () => [...data],
    insertOne: async (doc) => {
      data.push(doc);
    },
    updateOne: async () => {},
    deleteOne: async (filter) => {
      const idx = data.findIndex((d) => d["from"] === filter["from"]);
      if (idx !== -1) data.splice(idx, 1);
    },
    countDocuments: async () => data.length,
    createIndex: async () => {},
  };
  return {
    connect: async () => {},
    disconnect: async () => {},
    isAlive: async () => true,
    collection: <T extends Record<string, unknown>>(): ICollection<T> =>
      collection as unknown as ICollection<T>,
  };
}

describe("RedirectsService", () => {
  it("findByFrom returns null when no redirect exists", async () => {
    const svc = new RedirectsService(makeDb(), stubLogger);
    assert.equal(await svc.findByFrom("/old"), null);
  });

  it("create and findByFrom round-trip", async () => {
    const svc = new RedirectsService(makeDb(), stubLogger);
    await svc.create("/old", "/new");
    const result = await svc.findByFrom("/old");
    assert.ok(result !== null);
    assert.equal(result["from"], "/old");
    assert.equal(result["to"], "/new");
  });

  it("delete removes the redirect", async () => {
    const svc = new RedirectsService(makeDb(), stubLogger);
    await svc.create("/old", "/new");
    await svc.delete("/old");
    assert.equal(await svc.findByFrom("/old"), null);
  });

  it("list returns all redirects", async () => {
    const svc = new RedirectsService(makeDb(), stubLogger);
    await svc.create("/a", "/b");
    await svc.create("/c", "/d");
    const all = await svc.list();
    assert.equal(all.length, 2);
  });
});
