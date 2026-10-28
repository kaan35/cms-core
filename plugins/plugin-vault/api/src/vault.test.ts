import type { CoreServices } from "@cms/core";
import { ConfigService, decorateTestAuth, HookManager, PERMISSIONS, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import Fastify from "fastify";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VaultController } from "./controllers/vaultController.js";
import { VAULT_EVENTS, type VaultItemDoc } from "./domain/vault.rules.js";
import { registerVaultPlugin } from "./index.js";
import { initVaultMigration } from "./migrations/202601070000_init_vault.js";
import { VaultRepository } from "./repositories/vaultRepository.js";
import { registerVaultRoutes } from "./routes.js";
import { VaultService } from "./services/vaultService.js";
import { parseVaultCsv } from "./utils/vaultExportUtils.js";

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

    // 6. Fail-closed decryption: reject unencrypted and tampered records
    await db.collection<VaultItemDoc>("cms_vault_items").insertOne({
      id: "unencrypted-item-1",
      title: "Unencrypted Server",
      username: "root",
      password: "legacy-plaintext-password",
      category: "General",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await assert.rejects(
      async () => service.revealPassword("unencrypted-item-1"),
      /Invalid or unencrypted vault password payload/,
    );

    // 7. Reject truncated IV or authentication tag length
    await db.collection<VaultItemDoc>("cms_vault_items").insertOne({
      id: "truncated-tag-item-1",
      title: "Truncated Tag Server",
      username: "root",
      password: "enc:v1:00112233445566778899aabb:00112233:deadbeef",
      category: "General",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await assert.rejects(
      async () => service.revealPassword("truncated-tag-item-1"),
      /Invalid IV or authentication tag length in vault payload/,
    );

    // 8. Reject tampered ciphertext / authentication tag
    const tamperedPayload =
      rawStored.password.slice(0, -2) + (rawStored.password.endsWith("ff") ? "00" : "ff");
    await db.collection<VaultItemDoc>("cms_vault_items").insertOne({
      id: "tampered-item-1",
      title: "Tampered Server",
      username: "root",
      password: tamperedPayload,
      category: "General",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await assert.rejects(
      async () => service.revealPassword("tampered-item-1"),
      /Unsupported state or unable to authenticate data/,
    );
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
    } as unknown as CoreServices;

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
      } as unknown as CoreServices;

      await registerVaultPlugin(app, validServices);
    } finally {
      if (originalEnv !== undefined) {
        process.env["VAULT_SECRET"] = originalEnv;
      } else {
        delete process.env["VAULT_SECRET"];
      }
    }
  });

  it("tracks passwordChangedAt accurately on create, update, and preserves it when non-password fields change", async () => {
    const db = createInMemoryDb();
    await initVaultMigration.up(db);
    const repo = new VaultRepository(db);
    const hooks = new HookManager();
    const service = new VaultService(repo, hooks, stubLogger, TEST_VAULT_SECRET);

    // 1. Create item sets passwordChangedAt
    const created = await service.create({
      title: "AWS Console",
      username: "cloud-admin",
      password: "initial-password-123",
      category: "Cloud",
    });

    const itemInDb = await repo.findById(created.id!);
    assert.ok(itemInDb);
    assert.ok(itemInDb.passwordChangedAt instanceof Date);
    const initialChangedAt = itemInDb.passwordChangedAt;

    // Simulate time passing (e.g., 100 days ago)
    const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await db
      .collection<VaultItemDoc>("cms_vault_items")
      .updateOne({ id: created.id }, { $set: { passwordChangedAt: hundredDaysAgo } });

    const backdatedItem = await repo.findById(created.id!);
    assert.equal(backdatedItem?.passwordChangedAt?.getTime(), hundredDaysAgo.getTime());

    // 2. Update non-password field (e.g. notes) must PRESERVE passwordChangedAt
    await service.update(created.id!, {
      notes: "Updated billing contact",
    });

    const itemAfterNoteUpdate = await repo.findById(created.id!);
    assert.equal(
      itemAfterNoteUpdate?.passwordChangedAt?.getTime(),
      hundredDaysAgo.getTime(),
      "passwordChangedAt should NOT be modified when only notes are updated",
    );

    // 3. Update password MUST update passwordChangedAt to current time
    await service.update(created.id!, {
      password: "new-rotated-password-456",
    });

    const itemAfterPwdUpdate = await repo.findById(created.id!);
    assert.notEqual(
      itemAfterPwdUpdate?.passwordChangedAt?.getTime(),
      hundredDaysAgo.getTime(),
      "passwordChangedAt MUST be updated when password is changed",
    );
    assert.ok(
      itemAfterPwdUpdate!.passwordChangedAt!.getTime() >= initialChangedAt.getTime(),
      "New passwordChangedAt must be recent",
    );

    // 4. Legacy record without passwordChangedAt falls back to updatedAt or createdAt
    const legacyCreatedAt = new Date("2024-01-01T00:00:00.000Z");
    await db.collection<VaultItemDoc>("cms_vault_items").insertOne({
      id: "legacy-vault-item",
      title: "Old Database",
      username: "postgres",
      password: "enc:v1:00112233445566778899aabb:00112233445566778899aabbccddeeff:1234",
      createdAt: legacyCreatedAt,
      updatedAt: legacyCreatedAt,
    });

    const fetchedLegacy = await repo.findById("legacy-vault-item");
    assert.ok(fetchedLegacy);
    assert.equal(fetchedLegacy.passwordChangedAt?.toISOString(), legacyCreatedAt.toISOString());
  });

  it("generates blank template for xlsx and csv with correct headers and sample row", () => {
    const db = createInMemoryDb();
    const repo = new VaultRepository(db);
    const hooks = new HookManager();
    const service = new VaultService(repo, hooks, stubLogger, TEST_VAULT_SECRET);

    // XLSX template
    const xlsxTemplate = service.getTemplate("xlsx");
    assert.equal(
      xlsxTemplate.mimeType,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.equal(xlsxTemplate.filename, "vault-template.xlsx");
    assert.ok(Buffer.isBuffer(xlsxTemplate.data));
    // Verify PK header
    assert.equal(xlsxTemplate.data[0], 0x50);
    assert.equal(xlsxTemplate.data[1], 0x4b);

    // CSV template
    const csvTemplate = service.getTemplate("csv");
    assert.equal(csvTemplate.mimeType, "text/csv; charset=utf-8");
    assert.equal(csvTemplate.filename, "vault-template.csv");
    assert.equal(typeof csvTemplate.data, "string");
    assert.ok(
      (csvTemplate.data as string).startsWith(
        '\uFEFF"Title","Username","Password","URL","Category","Notes"',
      ),
    );
    assert.ok((csvTemplate.data as string).includes("Example Service"));
  });

  it("exports vault items with decrypted passwords and logs audit event", async () => {
    const db = createInMemoryDb();
    await initVaultMigration.up(db);
    const repo = new VaultRepository(db);
    const hooks = new HookManager();
    const service = new VaultService(repo, hooks, stubLogger, TEST_VAULT_SECRET);

    let exportEventFired = false;
    hooks.on(VAULT_EVENTS.EXPORTED, async () => {
      exportEventFired = true;
    });

    await service.create({
      title: "Stripe Production",
      username: "billing@company.com",
      password: "sk_live_secret_stripe_key_123",
      url: "https://stripe.com",
      category: "Finance",
    });

    // 1. Export CSV
    const csvExport = await service.exportItems("csv", "auditor-user-42");
    assert.ok(exportEventFired);
    assert.equal(csvExport.mimeType, "text/csv; charset=utf-8");
    assert.ok(csvExport.filename.startsWith("vault-export-"));
    const csvStr = csvExport.data as string;
    assert.ok(csvStr.includes("Stripe Production"));
    assert.ok(csvStr.includes("billing@company.com"));
    assert.ok(
      csvStr.includes("sk_live_secret_stripe_key_123"),
      "Password must be decrypted in export",
    );

    // 2. Export XLSX
    const xlsxExport = await service.exportItems("xlsx", "auditor-user-42");
    assert.equal(
      xlsxExport.mimeType,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.ok(Buffer.isBuffer(xlsxExport.data));
    assert.equal(xlsxExport.data[0], 0x50);
  });

  it("imports items from array, encrypts passwords, and reports row validation errors", async () => {
    const db = createInMemoryDb();
    await initVaultMigration.up(db);
    const repo = new VaultRepository(db);
    const hooks = new HookManager();
    const service = new VaultService(repo, hooks, stubLogger, TEST_VAULT_SECRET);

    let importEventCount = 0;
    hooks.on(VAULT_EVENTS.IMPORTED, async (payload) => {
      importEventCount = (payload as { importedCount: number }).importedCount;
    });

    const payload = [
      {
        title: "Docker Hub",
        username: "docker-user",
        password: "docker-secret-password-1",
        url: "https://hub.docker.com",
        category: "DevOps",
        tags: "containers, registry", // string tags should be accepted
      },
      {
        title: "Cloudflare",
        username: "dns-admin",
        password: "cf-token-secret-password-2",
        category: "Infrastructure",
        tags: ["dns", "security"],
      },
      {
        // Invalid item: missing title and password
        username: "invalid-entry",
      },
    ];

    const result = await service.importItems(payload, "importer-user-99");
    assert.equal(result.importedCount, 2);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0]?.row, 3);
    assert.equal(importEventCount, 2);

    // Verify imported records are encrypted in database
    const items = await repo.list();
    assert.equal(items.length, 2);
    const dockerItem = items.find((i) => i.title === "Docker Hub");
    assert.ok(dockerItem);
    assert.ok(dockerItem.password.startsWith("enc:v1:"));
    assert.ok(dockerItem.passwordChangedAt instanceof Date);
    assert.deepEqual(dockerItem.tags, ["containers", "registry"]);

    // Verify password can be revealed
    const revealed = await service.revealPassword(dockerItem.id!);
    assert.equal(revealed.password, "docker-secret-password-1");
  });

  it("parseVaultCsv parses RFC 4180 CSV with delimiters, quotes, newlines, and Turkish characters", () => {
    // 1. Standard comma CSV with Turkish headers & characters
    const turkishCsv = `\uFEFF"Başlık","Kullanıcı Adı","Şifre","URL","Kategori","Notlar","Etiketler"
"E-Devlet Giriş","tc12345678901","DevletŞifresi*2026","https://turkiye.gov.tr","Devlet","Önemli kimlik kartı","resmi,kamu"
"Banka Hesabı","musteri_no","BankaParolam!99","https://banka.com","Finans","İnternet şubesi","finans,para"`;

    const parsedTurkish = parseVaultCsv(turkishCsv);
    assert.equal(parsedTurkish.length, 2);
    assert.equal(parsedTurkish[0]?.["title"], "E-Devlet Giriş");
    assert.equal(parsedTurkish[0]?.["username"], "tc12345678901");
    assert.equal(parsedTurkish[0]?.["password"], "DevletŞifresi*2026");
    assert.equal(parsedTurkish[0]?.["url"], "https://turkiye.gov.tr");
    assert.equal(parsedTurkish[0]?.["category"], "Devlet");
    assert.equal(parsedTurkish[0]?.["notes"], "Önemli kimlik kartı");
    assert.equal(parsedTurkish[0]?.["tags"], "resmi,kamu");

    // 2. Semicolon delimited CSV with quotes & spaces
    const semicolonCsv = `Title;Username;Password;Category\n"PostgreSQL Cluster";"postgres";"SuperDBPass@2026";"Database"`;
    const parsedSemi = parseVaultCsv(semicolonCsv);
    assert.equal(parsedSemi.length, 1);
    assert.equal(parsedSemi[0]?.["title"], "PostgreSQL Cluster");
    assert.equal(parsedSemi[0]?.["username"], "postgres");
    assert.equal(parsedSemi[0]?.["password"], "SuperDBPass@2026");
    assert.equal(parsedSemi[0]?.["category"], "Database");

    // 3. Quoted cells containing commas, escaped quotes, and newlines
    const complexCsv = `"Title","Username","Password","Notes"
"Complex Service","user1","pass123","Line 1, with comma and ""quotes""
Line 2 after newline"`;
    const parsedComplex = parseVaultCsv(complexCsv);
    assert.equal(parsedComplex.length, 1);
    assert.equal(parsedComplex[0]?.["title"], "Complex Service");
    assert.ok(parsedComplex[0]?.["notes"]?.includes('with comma and "quotes"'));
    assert.ok(parsedComplex[0]?.["notes"]?.includes("Line 2 after newline"));
  });

  it("supports server-side pagination, search, and category filtering in VaultService and VaultRepository", async () => {
    const db = createInMemoryDb();
    await initVaultMigration.up(db);
    const repo = new VaultRepository(db);
    const hooks = new HookManager();
    const service = new VaultService(repo, hooks, stubLogger, TEST_VAULT_SECRET);

    await service.create({
      title: "Production Database",
      username: "dbadmin",
      password: "pwd-1",
      category: "Database",
    });
    await service.create({
      title: "Staging Database",
      username: "dbstaging",
      password: "pwd-2",
      category: "Database",
    });
    await service.create({
      title: "Production Redis",
      username: "redisadmin",
      password: "pwd-3",
      category: "DevOps",
    });
    await service.create({
      title: "GitHub Enterprise",
      username: "gitadmin",
      password: "pwd-4",
      category: "DevOps",
    });

    // Test getCategories
    const categories = await service.getCategories();
    assert.ok(categories.includes("Database"));
    assert.ok(categories.includes("DevOps"));

    // Page 1, limit 2
    const p1 = await service.listPaginated(1, 2);
    assert.equal(p1.data.length, 2);
    assert.equal(p1.meta.total, 4);
    assert.equal(p1.meta.totalPages, 2);

    // Filter by category
    const dbOnly = await service.listPaginated(1, 10, "Database");
    assert.equal(dbOnly.data.length, 2);
    assert.equal(dbOnly.meta.total, 2);
    assert.ok(dbOnly.data.every((it) => it.category === "Database"));

    // Filter by search
    const redisSearch = await service.listPaginated(1, 10, undefined, "redis");
    assert.equal(redisSearch.data.length, 1);
    assert.equal(redisSearch.data[0]?.title, "Production Redis");
  });

  it("enforces RBAC permissions on vault HTTP routes (vault:read and vault:write)", async () => {
    const app = Fastify();
    const db = createInMemoryDb();
    await initVaultMigration.up(db);
    const repo = new VaultRepository(db);
    const hooks = new HookManager();
    const service = new VaultService(repo, hooks, stubLogger, TEST_VAULT_SECRET);
    const controller = new VaultController(service);

    decorateTestAuth(app);
    registerVaultRoutes(app, controller);
    await app.ready();

    // 1. Unauthenticated request -> 401
    const unauthRes = await app.inject({
      method: "GET",
      url: "/vault/items",
    });
    assert.equal(unauthRes.statusCode, 401);

    // 2. Authenticated user without vault:read permission -> 403
    const noPermRes = await app.inject({
      method: "GET",
      url: "/vault/items",
      headers: {
        "x-test-user": "user-without-perms",
        "x-test-perms": "blog:read",
      },
    });
    assert.equal(noPermRes.statusCode, 403);

    // 3. User without vault:write cannot create items -> 403
    const noWriteCreateRes = await app.inject({
      method: "POST",
      url: "/vault/items",
      headers: {
        "x-test-user": "read-only-user",
        "x-test-perms": "vault:read",
      },
      payload: {
        title: "Test DB",
        username: "root",
        password: "secretpassword123",
      },
    });
    assert.equal(noWriteCreateRes.statusCode, 403);

    // 4. Authorized user with vault:write creates item -> 201
    const createRes = await app.inject({
      method: "POST",
      url: "/vault/items",
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": `${PERMISSIONS.VAULT.READ},${PERMISSIONS.VAULT.WRITE}`,
      },
      payload: {
        title: "Test DB",
        username: "root",
        password: "secretpassword123",
      },
    });
    assert.equal(createRes.statusCode, 201);
    const item = (createRes.json() as { item: { id: string } }).item;

    // 5. Authorized user with vault:read lists items -> 200 with masked password
    const listRes = await app.inject({
      method: "GET",
      url: "/vault/items",
      headers: {
        "x-test-user": "auditor-1",
        "x-test-perms": PERMISSIONS.VAULT.READ,
      },
    });
    assert.equal(listRes.statusCode, 200);
    const listData = (listRes.json() as { data: Array<{ password: string }> }).data;
    assert.equal(listData.length, 1);
    assert.equal(listData[0]?.password, "••••••••");

    // 6. User with only vault:read cannot reveal password -> 403
    const readOnlyRevealRes = await app.inject({
      method: "POST",
      url: `/vault/items/${item.id}/reveal`,
      headers: {
        "x-test-user": "auditor-1",
        "x-test-perms": PERMISSIONS.VAULT.READ,
      },
    });
    assert.equal(readOnlyRevealRes.statusCode, 403);

    // 7. User with vault:write reveals password -> 200 with decrypted secret
    const writeRevealRes = await app.inject({
      method: "POST",
      url: `/vault/items/${item.id}/reveal`,
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": PERMISSIONS.VAULT.WRITE,
      },
    });
    assert.equal(writeRevealRes.statusCode, 200);
    assert.equal((writeRevealRes.json() as { password: string }).password, "secretpassword123");
  });
});
