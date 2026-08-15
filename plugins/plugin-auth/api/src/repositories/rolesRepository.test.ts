import type { ICollection, IDatabase } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RoleDoc } from "./rolesRepository.js";
import { RolesRepository } from "./rolesRepository.js";

function makeStubDb(): IDatabase {
  const store = new Map<string, RoleDoc>();
  const collection: ICollection<RoleDoc> = {
    findOne: async (filter) => {
      for (const doc of store.values()) {
        if (filter["name"] && doc.name === filter["name"]) return doc;
        if (filter["id"] && doc.id === filter["id"]) return doc;
      }
      return null;
    },
    find: async (filter) => {
      const all = Array.from(store.values());
      if (filter && filter["id"] && typeof filter["id"] === "object" && "$in" in filter["id"]) {
        const ids = (filter["id"] as { $in: string[] })["$in"];
        return all.filter((r) => ids.includes(r.id));
      }
      return all;
    },
    insertOne: async (doc) => {
      store.set(doc["id"] as string, doc as unknown as RoleDoc);
    },
    updateOne: async () => {},
    deleteOne: async () => {},
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

describe("RolesRepository", () => {
  it("creates, finds by name, finds by ids and lists roles", async () => {
    const db = makeStubDb();
    const repo = new RolesRepository(db);

    const r1 = await repo.create({ name: "admin", permissions: ["*"] });
    const r2 = await repo.create({ name: "editor", permissions: ["users:read"] });

    const foundAdmin = await repo.findByName("admin");
    assert.equal(foundAdmin?.id, r1.id);

    const foundMany = await repo.findByIds([r1.id, r2.id]);
    assert.equal(foundMany.length, 2);

    const all = await repo.list();
    assert.equal(all.length, 2);
  });
});
