import type { ICollection, IDatabase } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionDoc } from "./sessionsRepository.js";
import { SessionsRepository } from "./sessionsRepository.js";

function makeStubDb(): IDatabase {
  const store = new Map<string, SessionDoc>();
  const collection: ICollection<SessionDoc> = {
    findOne: async (filter) => {
      for (const doc of store.values()) {
        if (filter["id"] && doc.id === filter["id"]) return doc;
      }
      return null;
    },
    find: async (filter) => {
      const all = Array.from(store.values());
      if (filter && filter["userId"]) return all.filter((s) => s.userId === filter["userId"]);
      return all;
    },
    insertOne: async (doc) => {
      store.set(doc["id"] as string, doc as unknown as SessionDoc);
    },
    updateOne: async (filter, update) => {
      const doc = store.get(filter["id"] as string);
      if (doc && update["$set"]) Object.assign(doc, update["$set"]);
    },
    deleteOne: async (filter) => {
      if (filter["id"]) {
        store.delete(filter["id"] as string);
      } else if (filter["userId"]) {
        for (const [k, v] of store.entries()) {
          if (v.userId === filter["userId"]) store.delete(k);
        }
      } else {
        store.clear();
      }
    },
    countDocuments: async () => store.size,
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

describe("SessionsRepository", () => {
  it("manages session lifecycle: create, find, updateExpiresAt, delete, deleteByUserId, deleteAll", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);

    const s1 = await repo.create({ userId: "u1", expiresAt: new Date(Date.now() + 10000) });
    await repo.create({ userId: "u1", expiresAt: new Date(Date.now() + 10000) });
    const s3 = await repo.create({ userId: "u2", expiresAt: new Date(Date.now() + 10000) });

    assert.equal(await repo.findById(s1.id), s1);
    assert.equal((await repo.findByUserId("u1")).length, 2);

    const newDate = new Date(Date.now() + 50000);
    await repo.updateExpiresAt(s1.id, newDate);
    assert.equal(s1.expiresAt, newDate);

    await repo.delete(s1.id);
    assert.equal(await repo.findById(s1.id), null);

    await repo.deleteByUserId("u1");
    assert.equal((await repo.findByUserId("u1")).length, 0);

    await repo.deleteAll();
    assert.equal(await repo.findById(s3.id), null);
  });
});
