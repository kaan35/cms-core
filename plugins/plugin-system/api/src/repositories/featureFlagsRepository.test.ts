import type { ICollection, IDatabase } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FeatureFlagDoc } from "./featureFlagsRepository.js";
import { FeatureFlagsRepository } from "./featureFlagsRepository.js";

function makeStubDb(): IDatabase {
  const store = new Map<string, FeatureFlagDoc>();
  const collection: ICollection<FeatureFlagDoc> = {
    findOne: async (filter) => store.get(filter["key"] as string) ?? null,
    find: async () => Array.from(store.values()),
    insertOne: async (doc) => {
      store.set(doc["key"] as string, doc as unknown as FeatureFlagDoc);
    },
    updateOne: async (filter, update) => {
      const doc = store.get(filter["key"] as string);
      if (doc && update["$set"]) Object.assign(doc, update["$set"]);
    },
    deleteOne: async (filter) => {
      store.delete(filter["key"] as string);
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

describe("FeatureFlagsRepository", () => {
  it("creates, finds, updates, and deletes feature flags", async () => {
    const db = makeStubDb();
    const repo = new FeatureFlagsRepository(db);

    const created = await repo.create({
      key: "dark_mode",
      label: "Dark Mode Theme",
      description: "Enables dark theme toggle",
      value: false,
    });

    assert.equal(created.key, "dark_mode");
    assert.equal(created.value, false);

    const found = await repo.findByKey("dark_mode");
    assert.equal(found?.label, "Dark Mode Theme");

    const updated = await repo.update("dark_mode", { value: true, label: "Dark Theme" });
    assert.equal(updated?.value, true);
    assert.equal(updated?.label, "Dark Theme");

    const all = await repo.list();
    assert.equal(all.length, 1);

    const deleted = await repo.delete("dark_mode");
    assert.equal(deleted, true);

    const notFound = await repo.findByKey("dark_mode");
    assert.equal(notFound, null);
  });
});
