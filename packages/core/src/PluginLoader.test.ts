import Fastify from "fastify";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PluginLoader } from "./PluginLoader.js";
import type { ICollection, IDatabase } from "./types/IDatabase.js";
import type { CoreServices, PluginManifestEntry } from "./types/plugin.js";

const stubLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const stubServices = {} as CoreServices;

function makeDb(pluginEnabled: boolean): IDatabase {
  const pluginsCol: ICollection<Record<string, unknown>> = {
    findOne: async () => ({ name: "test-plugin", enabled: pluginEnabled, createdAt: new Date() }),
    find: async () => [],
    insertOne: async () => {},
    updateOne: async () => {},
    deleteOne: async () => {},
    countDocuments: async () => 1,
    createIndex: async () => {},
  };
  const migrationsCol: ICollection<Record<string, unknown>> = {
    findOne: async () => null,
    find: async () => [],
    insertOne: async () => {},
    updateOne: async () => {},
    deleteOne: async () => {},
    countDocuments: async () => 0,
    createIndex: async () => {},
  };
  return {
    connect: async () => {},
    disconnect: async () => {},
    collection: <T extends Record<string, unknown>>(name: string): ICollection<T> =>
      (name === "cms_plugins" ? pluginsCol : migrationsCol) as unknown as ICollection<T>,
  };
}

describe("PluginLoader", () => {
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

  it("disabled plugin: route returns 503 (Rule 28 — proven by real HTTP call)", async () => {
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

  it("loads plugins in priority order (lower priority first)", async () => {
    const order: string[] = [];
    const app = Fastify({ logger: false });

    // All plugins enabled in this stub
    const db: IDatabase = {
      connect: async () => {},
      disconnect: async () => {},
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
});
