import { createInMemoryDb } from "@cms/core/testing";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PluginDoc } from "./pluginsRepository.js";
import { PluginsRepository } from "./pluginsRepository.js";

describe("PluginsRepository", () => {
  it("lists, finds, and toggles plugins", async () => {
    const db = createInMemoryDb();
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
