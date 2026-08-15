import type { ICollection, IDatabase } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PluginDoc } from "./pluginsRepository.js";
import { PluginsRepository } from "./pluginsRepository.js";

function makeStubDb(): IDatabase {
  const store = new Map<string, PluginDoc>();
  const collection: ICollection<PluginDoc> = {
    findOne: async (filter) => store.get(filter["name"] as string) ?? null,
    find: async () => Array.from(store.values()),
    insertOne: async (doc) => {
      store.set(doc["name"] as string, doc as unknown as PluginDoc);
    },
    updateOne: async (filter, update) => {
      const doc = store.get(filter["name"] as string);
      if (doc && update["$set"]) Object.assign(doc, update["$set"]);
    },
    deleteOne: async (filter) => {
      store.delete(filter["name"] as string);
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

describe("PluginsRepository", () => {
  it("lists, finds, and toggles plugins", async () => {
    const db = makeStubDb();
    const repo = new PluginsRepository(db);

    const col = db.collection<PluginDoc>("cms_plugins");
    await col.insertOne({ name: "plugin-media", enabled: true, createdAt: new Date() });

    const plugins = await repo.list();
    assert.equal(plugins.length, 1);
    assert.equal(plugins[0]?.name, "plugin-media");
    assert.equal(plugins[0]?.enabled, true);

    const updated = await repo.setEnabled("plugin-media", false);
    assert.equal(updated?.enabled, false);
    assert.ok(updated?.updatedAt);

    const found = await repo.findByName("plugin-media");
    assert.equal(found?.enabled, false);
  });
});
