import Fastify from "fastify";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePluginManifest } from "../pluginManifest.js";
import type { ICollection, IDatabase } from "../types/IDatabase.js";
import type { ILogger } from "../types/ILogger.js";
import type { CoreServices, PluginManifestEntry } from "../types/plugin.js";
import { PluginLoader } from "./PluginLoader.js";

const stubLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const stubServices = {} as CoreServices;

function makeDb(pluginEnabled: boolean): IDatabase {
  const pluginsCol: ICollection<Record<string, unknown>> = {
    findOne: async () => ({ name: "test-plugin", enabled: pluginEnabled, createdAt: new Date() }),
    find: async () => [{ name: "test-plugin", enabled: pluginEnabled, createdAt: new Date() }],
    insertOne: async () => {},
    insertMany: async () => {},
    updateOne: async () => {},
    updateMany: async () => ({ modifiedCount: 0 }),
    deleteOne: async () => {},
    deleteMany: async () => ({ deletedCount: 0 }),
    countDocuments: async () => 1,
    createIndex: async () => {},
  };
  const migrationsCol: ICollection<Record<string, unknown>> = {
    findOne: async () => null,
    find: async () => [],
    insertOne: async () => {},
    insertMany: async () => {},
    updateOne: async () => {},
    updateMany: async () => ({ modifiedCount: 0 }),
    deleteOne: async () => {},
    deleteMany: async () => ({ deletedCount: 0 }),
    countDocuments: async () => 0,
    createIndex: async () => {},
  };
  return {
    connect: async () => {},
    disconnect: async () => {},
    isAlive: async () => true,
    collection: <T extends Record<string, unknown>>(name: string): ICollection<T> =>
      (name === "cms_plugins" ? pluginsCol : migrationsCol) as unknown as ICollection<T>,
  };
}

describe("PluginLoader & resolvePluginManifest", () => {
  it("enabled plugin: route responds normally", async () => {
    const app = Fastify({ logger: false });
    const loader = new PluginLoader(makeDb(true), stubLogger, app, stubServices);

    const manifest: PluginManifestEntry[] = [
      {
        name: "test-plugin",
        priority: 10,
        register: async (scope) => {
          scope.get("/hello", () => ({ ok: true }));
        },
      },
    ];

    await loader.loadAll(manifest, []);

    const res = await app.inject({ method: "GET", url: "/hello" });
    assert.equal(res.statusCode, 200);
    await app.close();
  });

  it("disabled plugin: route returns 503", async () => {
    const app = Fastify({ logger: false });
    const loader = new PluginLoader(makeDb(false), stubLogger, app, stubServices);

    const manifest: PluginManifestEntry[] = [
      {
        name: "test-plugin",
        priority: 10,
        register: async (scope) => {
          scope.get("/secret", () => ({ sensitive: true }));
        },
      },
    ];

    await loader.loadAll(manifest, []);

    const res = await app.inject({ method: "GET", url: "/secret" });
    assert.equal(res.statusCode, 503);
    await app.close();
  });

  it("dynamically toggled plugin switches from 200 to 503 via reloadStates", async () => {
    const app = Fastify({ logger: false });
    let isEnabled = true;
    const db: IDatabase = {
      connect: async () => {},
      disconnect: async () => {},
      isAlive: async () => true,
      collection: <T extends Record<string, unknown>>(): ICollection<T> =>
        ({
          findOne: async () => ({
            name: "toggle-plugin",
            enabled: isEnabled,
            createdAt: new Date(),
          }),
          find: async () => [{ name: "toggle-plugin", enabled: isEnabled, createdAt: new Date() }],
          insertOne: async () => {},
          updateOne: async () => {},
          deleteOne: async () => {},
          countDocuments: async () => 1,
          createIndex: async () => {},
        }) as unknown as ICollection<T>,
    };

    const loader = new PluginLoader(db, stubLogger, app, stubServices);
    const manifest: PluginManifestEntry[] = [
      {
        name: "toggle-plugin",
        priority: 10,
        register: async (scope) => {
          scope.get("/live-endpoint", () => ({ status: "alive" }));
        },
      },
    ];

    await loader.loadAll(manifest, []);

    // 1. Initially enabled -> 200
    const res1 = await app.inject({ method: "GET", url: "/live-endpoint" });
    assert.equal(res1.statusCode, 200);

    // 2. Disable plugin in DB and reload states
    isEnabled = false;
    await loader.reloadStates();

    // 3. Immediately returns 503 without restarting server
    const res2 = await app.inject({ method: "GET", url: "/live-endpoint" });
    assert.equal(res2.statusCode, 503);
    await app.close();
  });

  it("loads plugins in priority order (lower priority first)", async () => {
    const order: string[] = [];
    const app = Fastify({ logger: false });

    // All plugins enabled in this stub
    const db: IDatabase = {
      connect: async () => {},
      disconnect: async () => {},
      isAlive: async () => true,
      collection: <T extends Record<string, unknown>>(): ICollection<T> =>
        ({
          findOne: async () => ({ name: "p", enabled: true, createdAt: new Date() }),
          find: async () => [],
          insertOne: async () => {},
          updateOne: async () => {},
          deleteOne: async () => {},
          countDocuments: async () => 0,
          createIndex: async () => {},
        }) as unknown as ICollection<T>,
    };

    const loader = new PluginLoader(db, stubLogger, app, stubServices);
    const manifest: PluginManifestEntry[] = [
      {
        name: "high-priority",
        priority: 5,
        register: async () => {
          order.push("high");
        },
      },
      {
        name: "low-priority",
        priority: 20,
        register: async () => {
          order.push("low");
        },
      },
    ];

    await loader.loadAll(manifest, []);
    await app.ready();

    assert.deepEqual(order, ["high", "low"]);
    await app.close();
  });

  it("deactivates previously enabled DB plugins that are not in the resolved manifest without deleting them", async () => {
    const app = Fastify({ logger: false });
    const records: Array<Record<string, unknown>> = [
      { name: "plugin-auth", enabled: true, createdAt: new Date() },
      { name: "plugin-vault", enabled: true, createdAt: new Date() },
      { name: "plugin-forms", enabled: true, createdAt: new Date() },
    ];
    let deletedCount = 0;
    const warnings: Array<{ message: string; meta?: Record<string, unknown> | undefined }> = [];

    const db: IDatabase = {
      connect: async () => {},
      disconnect: async () => {},
      isAlive: async () => true,
      collection: <T extends Record<string, unknown>>(name: string): ICollection<T> =>
        ({
          findOne: async (filter: Record<string, unknown>) =>
            name === "cms_plugins"
              ? (records.find((r) => r["name"] === filter["name"]) ?? null)
              : null,
          find: async () => (name === "cms_plugins" ? [...records] : []),
          insertOne: async (doc: Record<string, unknown>) => {
            if (name === "cms_plugins") records.push(doc);
          },
          updateOne: async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
            if (name === "cms_plugins") {
              const target = records.find((r) => r["name"] === filter["name"]);
              if (target && update["$set"] && typeof update["$set"] === "object") {
                Object.assign(target, update["$set"]);
              }
            }
          },
          deleteOne: async () => {
            deletedCount++;
          },
          countDocuments: async () => records.length,
          createIndex: async () => {},
        }) as unknown as ICollection<T>,
    };

    const warnLogger: ILogger = {
      debug: () => {},
      info: () => {},
      warn: (message: string, meta?: Record<string, unknown>) => {
        warnings.push({ message, meta });
      },
      error: () => {},
    };

    const loader = new PluginLoader(db, warnLogger, app, stubServices);
    const manifest: PluginManifestEntry[] = [
      {
        name: "plugin-auth",
        priority: 1,
        register: async () => {},
      },
      {
        name: "plugin-vault",
        priority: 10,
        register: async () => {},
      },
    ];

    await loader.loadAll(manifest, []);

    assert.equal(deletedCount, 0, "Should not delete plugin records from DB");
    assert.equal(records.length, 3, "All 3 records should remain in cms_plugins");
    const formsRecord = records.find((r) => r["name"] === "plugin-forms");
    assert.equal(formsRecord?.["enabled"], false, "plugin-forms should be set to enabled: false");
    assert.ok(formsRecord?.["updatedAt"] instanceof Date, "updatedAt should be set");
    assert.equal(warnings.length, 1);
    assert.ok(
      warnings[0]?.message.includes(
        "Plugin deactivated because it is not in the resolved manifest: plugin-forms",
      ),
    );
    assert.deepEqual(warnings[0]?.meta, { name: "plugin-forms" });

    await app.close();
  });

  it("resolvePluginManifest supports minimal, full, comma-separated profiles and throws on unknown plugin name", async () => {
    const baseManifest: PluginManifestEntry[] = [
      { name: "plugin-auth", priority: 1, register: async () => {} },
      { name: "plugin-system", priority: 2, register: async () => {} },
      { name: "plugin-pages", priority: 10, register: async () => {} },
      { name: "plugin-blog", priority: 20, register: async () => {} },
      { name: "plugin-forms", priority: 30, register: async () => {} },
      { name: "plugin-media", priority: 40, register: async () => {} },
      { name: "plugin-vault", priority: 50, register: async () => {} },
    ];

    const minimal = await resolvePluginManifest(baseManifest, stubLogger, "minimal");
    assert.deepEqual(
      minimal.map((e) => e.name),
      ["plugin-auth", "plugin-system"],
    );

    const full = await resolvePluginManifest(baseManifest, stubLogger, "full");
    assert.equal(full.length, 7);

    const vaultOnly = await resolvePluginManifest(baseManifest, stubLogger, "vault");
    assert.deepEqual(
      vaultOnly.map((e) => e.name),
      ["plugin-auth", "plugin-system", "plugin-vault"],
    );

    const pagesAndBlog = await resolvePluginManifest(
      baseManifest,
      stubLogger,
      "pages, plugin-blog",
    );
    assert.deepEqual(
      pagesAndBlog.map((e) => e.name),
      ["plugin-auth", "plugin-system", "plugin-pages", "plugin-blog"],
    );

    await assert.rejects(
      async () => {
        await resolvePluginManifest(baseManifest, stubLogger, "vaullt,pages");
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("Unknown plugin(s) in PLUGINS: plugin-vaullt"));
        assert.ok(err.message.includes("plugin-vault"));
        return true;
      },
    );
  });
});
