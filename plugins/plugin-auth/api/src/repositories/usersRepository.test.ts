import type { ICollection, IDatabase } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UserDoc } from "./usersRepository.js";
import { UsersRepository } from "./usersRepository.js";

function makeStubDb(): IDatabase {
  const store = new Map<string, UserDoc>();
  const collection: ICollection<UserDoc> = {
    findOne: async (filter) => {
      for (const doc of store.values()) {
        if (filter["email"] && doc.email === filter["email"]) return doc;
        if (filter["id"] && doc.id === filter["id"]) return doc;
      }
      return null;
    },
    find: async (_filter, options = {}) => {
      let docs = Array.from(store.values());
      if (options.skip) docs = docs.slice(options.skip);
      if (options.limit) docs = docs.slice(0, options.limit);
      return docs;
    },
    insertOne: async (doc) => {
      store.set(doc["id"] as string, doc as unknown as UserDoc);
    },
    updateOne: async (filter, update) => {
      const doc = store.get(filter["id"] as string);
      if (doc && update["$set"]) Object.assign(doc, update["$set"]);
    },
    deleteOne: async (filter) => {
      if (filter["id"]) store.delete(filter["id"] as string);
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

describe("UsersRepository", () => {
  it("creates, finds by email/id, counts and lists users", async () => {
    const db = makeStubDb();
    const repo = new UsersRepository(db);

    assert.equal(await repo.count(), 0);

    const user = await repo.create({
      email: "test@example.com",
      passwordHash: "hash123",
      roleIds: ["admin"],
    });

    assert.equal(await repo.count(), 1);
    assert.equal(user.email, "test@example.com");

    const foundByEmail = await repo.findByEmail("TEST@example.com");
    assert.equal(foundByEmail?.id, user.id);

    const foundById = await repo.findById(user.id);
    assert.equal(foundById?.email, "test@example.com");

    const list = await repo.list();
    assert.equal(list.length, 1);
  });
});
