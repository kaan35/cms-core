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
});
