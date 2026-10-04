import { ConfigService, HookManager, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import Fastify from "fastify";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VAULT_EVENTS, type VaultItemDoc } from "./domain/vault.rules.js";
import { registerVaultPlugin } from "./index.js";
import { initVaultMigration } from "./migrations/202601070000_init_vault.js";
import { VaultRepository } from "./repositories/vaultRepository.js";
import { VaultService } from "./services/vaultService.js";

const TEST_VAULT_SECRET = "test-vault-secret-key-32-chars-long-min";

describe("Vault Plugin API", () => {
  it("generates random password with specified criteria", () => {
    const db = createInMemoryDb();
    const repo = new VaultRepository(db);
    const hooks = new HookManager();
    const service = new VaultService(repo, hooks, stubLogger, TEST_VAULT_SECRET);

    const pwd16 = service.generatePassword({ length: 16 });
    assert.equal(pwd16.length, 16);

    const pwd32 = service.generatePassword({ length: 32 });
    assert.equal(pwd32.length, 32);
  });

  it("creates, lists, masks, reveals, updates, and deletes vault items", async () => {
    const db = createInMemoryDb();
    await initVaultMigration.up(db);

    const repo = new VaultRepository(db);
    const hooks = new HookManager();
    const service = new VaultService(repo, hooks, stubLogger, TEST_VAULT_SECRET);

    let revealedEvent: unknown = null;
    hooks.on(VAULT_EVENTS.REVEALED, async (payload) => {
      revealedEvent = payload;
    });

    // 1. Create item
    const created = await service.create(
      {
        title: "GitHub Root",
        username: "dev@company.com",
        password: "super-secret-password-123",
        url: "https://github.com",
        category: "Development",
      },
      "admin-user-1",
    );

    assert.equal(created.title, "GitHub Root");
    // Verify database document is AES-256-GCM encrypted and never stored as plaintext
    const rawStored = await db
      .collection<VaultItemDoc>("cms_vault_items")
      .findOne({ id: created.id });
    assert.ok(rawStored);
    assert.notEqual(rawStored.password, "super-secret-password-123");
    assert.ok(rawStored.password.startsWith("enc:v1:"));

    // 2. List items
    const list = await service.list();
    assert.equal(list.length, 1);
    assert.equal(list[0]!.password, "••••••••");

    // 3. Reveal password (decrypts on the fly)
    const revealed = await service.revealPassword(created.id!, "admin-user-1");
    assert.equal(revealed.password, "super-secret-password-123");
    assert.ok(revealedEvent);

    // 4. Update item
    const updated = await service.update(created.id!, {
      notes: "Updated note",
    });
    assert.equal(updated.notes, "Updated note");

    // 5. Delete item
    const deleted = await service.delete(created.id!);
    assert.equal(deleted, true);

    const listAfterDelete = await service.list();
    assert.equal(listAfterDelete.length, 0);

    // 6. Legacy plaintext fallback: verify unencrypted items can still be revealed
    await db.collection<VaultItemDoc>("cms_vault_items").insertOne({
      id: "legacy-item-1",
      title: "Legacy Server",
      username: "root",
      password: "legacy-plaintext-password",
      category: "General",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const legacyRevealed = await service.revealPassword("legacy-item-1");
    assert.equal(legacyRevealed.password, "legacy-plaintext-password");
  });

  it("enforces fail-closed secret validation in VaultService", () => {
    const db = createInMemoryDb();
    const repo = new VaultRepository(db);
    const hooks = new HookManager();

    const originalEnv = process.env["VAULT_SECRET"];
    delete process.env["VAULT_SECRET"];

    try {
      // 1. Missing secret key
      assert.throws(
        () => new VaultService(repo, hooks, stubLogger),
        /VAULT_SECRET is required and must be at least 32 characters long/,
      );

      // 2. Short string (< 32 chars)
      assert.throws(
        () => new VaultService(repo, hooks, stubLogger, "too-short-secret"),
        /VAULT_SECRET is required and must be at least 32 characters long/,
      );

      // 3. Empty buffer
      assert.throws(
        () => new VaultService(repo, hooks, stubLogger, Buffer.alloc(0)),
        /VAULT_SECRET buffer must not be empty/,
      );

      // 4. Valid buffer works
      const validBuffer = Buffer.alloc(32, 1);
      const serviceFromBuf = new VaultService(repo, hooks, stubLogger, validBuffer);
      assert.ok(serviceFromBuf);

      // 5. Valid process.env works
      process.env["VAULT_SECRET"] = "test-env-secret-32-chars-long-minimum";
      const serviceFromEnv = new VaultService(repo, hooks, stubLogger);
      assert.ok(serviceFromEnv);
    } finally {
      if (originalEnv !== undefined) {
        process.env["VAULT_SECRET"] = originalEnv;
      } else {
        delete process.env["VAULT_SECRET"];
      }
    }
  });

  it("enforces fail-closed boot in registerVaultPlugin", async () => {
    const db = createInMemoryDb();
    const hooks = new HookManager();
    const app = Fastify();

    // 1. Missing VAULT_SECRET throws on boot
    const emptyConfig = new ConfigService({});
    const services = {
      db,
      logger: stubLogger,
      hooks,
      config: emptyConfig,
    } as any;

    const originalEnv = process.env["VAULT_SECRET"];
    delete process.env["VAULT_SECRET"];

    try {
      await assert.rejects(
        async () => registerVaultPlugin(app, services),
        /VAULT_SECRET is required and must be at least 32 characters long\. Boot failed\./,
      );

      // 2. Valid VAULT_SECRET boots successfully
      const validConfig = new ConfigService({
        VAULT_SECRET: "test-vault-secret-key-32-chars-long-min",
      });
      const validServices = {
        db,
        logger: stubLogger,
        hooks,
        config: validConfig,
      } as any;

      await registerVaultPlugin(app, validServices);
    } finally {
      if (originalEnv !== undefined) {
        process.env["VAULT_SECRET"] = originalEnv;
      } else {
        delete process.env["VAULT_SECRET"];
      }
    }
  });
});
