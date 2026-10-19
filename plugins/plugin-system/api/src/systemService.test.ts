import type { PluginLoader } from "@cms/core";
import {
  ConflictError,
  HookManager,
  NotFoundError,
  SettingsService,
  ValidationError,
  stubLogger,
} from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuditLogRepository } from "./repositories/auditLogRepository.js";
import { FeatureFlagsRepository } from "./repositories/featureFlagsRepository.js";
import { PluginsRepository } from "./repositories/pluginsRepository.js";
import { SystemService } from "./systemService.js";

describe("SystemService", () => {
  const setup = async () => {
    const db = createInMemoryDb();
    const pluginsRepo = new PluginsRepository(db);
    const featureFlagsRepo = new FeatureFlagsRepository(db);
    const auditLogRepo = new AuditLogRepository(db);
    const settings = new SettingsService(db, stubLogger);
    const hooks = new HookManager();

    let reloaded = false;
    const stubPluginLoader = {
      reloadStates: async () => {
        reloaded = true;
      },
    } as unknown as PluginLoader;

    const service = new SystemService(
      pluginsRepo,
      featureFlagsRepo,
      auditLogRepo,
      settings,
      stubPluginLoader,
      hooks,
      db,
      stubLogger,
    );

    service.registerAuditHooks();

    return {
      service,
      db,
      hooks,
      pluginsRepo,
      featureFlagsRepo,
      auditLogRepo,
      isReloaded: () => reloaded,
    };
  };

  it("toggles plugin, reloads states, and emits event", async () => {
    const { service, db, isReloaded } = await setup();

    const pluginsCol = db.collection("cms_plugins");
    await pluginsCol.insertOne({ name: "plugin-media", enabled: true, createdAt: new Date() });

    const toggled = await service.togglePlugin("plugin-media", false, "admin-1");
    assert.equal(toggled.enabled, false);
    assert.equal(isReloaded(), true);

    await assert.rejects(async () => service.togglePlugin("unknown", true), NotFoundError);
  });

  it("updates settings and validates hex color", async () => {
    const { service } = await setup();

    const initial = await service.getSettings();
    assert.equal(initial.brandColor, "#3b82f6");
    assert.equal(initial.brandFont, "Inter");

    // Invalid hex color should throw ValidationError
    await assert.rejects(
      async () => service.updateSettings({ brandColor: "invalid-color" }),
      ValidationError,
    );

    const updated = await service.updateSettings({
      brandColor: "#ff00aa",
      brandFont: "Roboto",
      adminTitle: "Password Manager Admin",
      siteTitle: "Password Manager Website",
    });
    assert.equal(updated.brandColor, "#ff00aa");
    assert.equal(updated.brandFont, "Roboto");
    assert.equal(updated.adminTitle, "Password Manager Admin");
    assert.equal(updated.siteTitle, "Password Manager Website");
  });

  it("manages feature flags lifecycle", async () => {
    const { service } = await setup();

    // Invalid flag key
    await assert.rejects(
      async () =>
        service.createFeatureFlag({ key: "invalid key with spaces", label: "Test", value: true }),
      ValidationError,
    );

    const flag = await service.createFeatureFlag({
      key: "new_checkout",
      label: "New Checkout Flow",
      value: true,
    });
    assert.equal(flag.key, "new_checkout");
    assert.equal(flag.value, true);

    // Conflict error on duplicate key
    await assert.rejects(
      async () =>
        service.createFeatureFlag({ key: "new_checkout", label: "Duplicate", value: false }),
      ConflictError,
    );

    const updated = await service.updateFeatureFlag("new_checkout", { value: false });
    assert.equal(updated.value, false);

    await service.deleteFeatureFlag("new_checkout");
    await assert.rejects(async () => service.getFeatureFlag("new_checkout"), NotFoundError);
  });

  it("automatic audit logging captures platform events", async () => {
    const { service, hooks, auditLogRepo } = await setup();

    await hooks.emit("user.created", {
      userId: "user-1",
      email: "user@example.com",
      actorId: "admin-1",
    });

    const count = await auditLogRepo.count();
    assert.equal(count, 1);

    const logs = await service.listAuditLogs(1, 10);
    assert.equal(logs.data.length, 1);
    assert.equal(logs.data[0]?.event, "user.created");
  });

  it("searches audit logs by resolved token name and user email", async () => {
    const { service, db, auditLogRepo } = await setup();

    // Seed token in cms_api_tokens
    const tokensCol = db.collection<{ id: string; name: string; tokenPrefix?: string }>(
      "cms_api_tokens",
    );
    await tokensCol.insertOne({ id: "tok-uuid-1", name: "Test 1", tokenPrefix: "cms_tok_...e710" });

    // Seed user in cms_users
    const usersCol = db.collection<{ id: string; email: string }>("cms_users");
    await usersCol.insertOne({ id: "user-uuid-1", email: "admin@test.com" });

    // Create raw audit records
    await auditLogRepo.create({
      event: "mcp.tool_executed",
      actorId: "user-uuid-1",
      actorType: "agent",
      tokenId: "api-token:tok-uuid-1",
      data: { tool: "get_form_submissions" },
    });

    await auditLogRepo.create({
      event: "user.updated",
      actorId: "user-uuid-1",
      actorType: "user",
    });

    // 1. Search by token name: "test 1"
    const tokenSearchResults = await service.listAuditLogs(1, 10, "test 1");
    assert.equal(tokenSearchResults.data.length, 1);
    assert.equal(tokenSearchResults.data[0]?.event, "mcp.tool_executed");
    assert.equal(tokenSearchResults.meta.total, 1);

    // 2. Search by user email: "admin@test.com"
    const userSearchResults = await service.listAuditLogs(1, 10, "admin@test.com");
    assert.equal(userSearchResults.data.length, 2);
    assert.equal(userSearchResults.meta.total, 2);

    // 3. Search non-existent
    const emptyResults = await service.listAuditLogs(1, 10, "nonexistent");
    assert.equal(emptyResults.data.length, 0);
    assert.equal(emptyResults.meta.total, 0);
  });

  it("getStats returns counts for pages, posts, forms, users, and plugins", async () => {
    const { service, db } = await setup();

    const pagesCol = db.collection("cms_pages");
    await pagesCol.insertOne({ id: "p1", title: "Home", status: "published" });
    await pagesCol.insertOne({ id: "p2", title: "Draft", status: "draft" });

    const postsCol = db.collection("cms_blog_posts");
    await postsCol.insertOne({ id: "b1", title: "Post 1", status: "published" });

    const formsCol = db.collection("cms_forms");
    await formsCol.insertOne({ id: "f1", title: "Contact" });

    const usersCol = db.collection("cms_users");
    await usersCol.insertOne({ id: "u1", email: "admin@example.com" });

    const pluginsCol = db.collection("cms_plugins");
    await pluginsCol.insertOne({ name: "plugin-auth", enabled: true });
    await pluginsCol.insertOne({ name: "plugin-pages", enabled: false });

    const stats = await service.getStats();
    assert.equal(stats.status, "ok");
    assert.equal(stats.pagesCount, 1);
    assert.equal(stats.postsCount, 1);
    assert.equal(stats.formsCount, 1);
    assert.equal(stats.usersCount, 1);
    assert.equal(stats.pluginsCount, 1);
    assert.equal(stats.totalPlugins, 2);
  });
});
