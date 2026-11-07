import { createInMemoryDb } from "@cms/core/testing";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RolesRepository } from "./rolesRepository.js";

describe("RolesRepository", () => {
  it("creates, finds by name, finds by ids and lists roles", async () => {
    const db = createInMemoryDb();
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

  it("getStats safely handles empty DB and findByName handles missing role gracefully", async () => {
    const db = createInMemoryDb();
    const repo = new RolesRepository(db);

    // 1. findByName returns null when no admin role exists
    const missingAdmin = await repo.findByName("admin");
    assert.equal(missingAdmin, null);

    // 2. getStats returns zeros on empty database
    const emptyStats = await repo.getStats();
    assert.deepEqual(emptyStats, { total: 0, systemCount: 0, customCount: 0 });

    // 3. Create system and custom roles
    await repo.create({ name: "admin", permissions: ["*"], isSystem: true });
    await repo.create({ name: "custom-reviewer", permissions: ["pages:read"], isSystem: false });

    const foundAdmin = await repo.findByName("admin");
    assert.ok(foundAdmin);
    assert.equal(foundAdmin.name, "admin");
    assert.equal(foundAdmin.isSystem, true);
  });
});
