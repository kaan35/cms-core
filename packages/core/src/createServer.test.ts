import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createServer } from "./createServer.js";
import { NotFoundError } from "./errors/AppError.js";
import { resolvePluginManifest } from "./pluginManifest.js";
import type { ICache } from "./types/ICache.js";
import type { ICollection, IDatabase } from "./types/IDatabase.js";

function makeStubCollection(): ICollection<Record<string, unknown>> {
  return {
    findOne: async () => null,
    find: async () => [],
    insertOne: async () => {},
    updateOne: async () => {},
    deleteOne: async () => {},
    countDocuments: async () => 0,
    createIndex: async () => {},
  };
}

const stubDb: IDatabase = {
  connect: async () => {},
  disconnect: async () => {},
  isAlive: async () => true,
  collection: <T extends Record<string, unknown>>(): ICollection<T> =>
    makeStubCollection() as unknown as ICollection<T>,
};

const stubCache: ICache = {
  get: async () => null,
  set: async () => {},
  del: async () => {},
  isAlive: async () => true,
  quit: async () => {},
};

const testEnv: Record<string, string> = { LOG_LEVEL: "error" };

describe("createServer", () => {
  it("returns 404 for unknown routes", async () => {
    const app = await createServer(stubDb, stubCache, testEnv);
    const res = await app.inject({ method: "GET", url: "/does-not-exist" });
    assert.equal(res.statusCode, 404);
    await app.close();
  });

  it("AppError subclass → correct statusCode, no stack leak", async () => {
    const app = await createServer(stubDb, stubCache, testEnv);

    app.get("/__test_app_error", () => {
      throw new NotFoundError("item not found");
    });

    const res = await app.inject({ method: "GET", url: "/__test_app_error" });
    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    assert.equal(body["error"], "item not found");
    await app.close();
  });

  it("unknown errors → 500 with generic message, no stack leak", async () => {
    const app = await createServer(stubDb, stubCache, testEnv);

    app.get("/__test_unknown_error", () => {
      throw new Error("db connection string: mongodb://secret:password@host");
    });

    const res = await app.inject({ method: "GET", url: "/__test_unknown_error" });
    assert.equal(res.statusCode, 500);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    assert.equal(body["error"], "Internal server error");
    // Verify no stack/secret leakage
    assert.ok(!res.body.includes("secret"));
    assert.ok(!res.body.includes("password"));
    await app.close();
  });

  it("trustProxy: true — request.ip resolves from X-Forwarded-For, not Docker-internal IP", async () => {
    const app = await createServer(stubDb, stubCache, testEnv);

    app.get("/__test_ip", (req, reply) => {
      return reply.send({ ip: req.ip });
    });

    const clientIp = "203.0.113.42";
    const res = await app.inject({
      method: "GET",
      url: "/__test_ip",
      headers: { "x-forwarded-for": clientIp },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { ip: string };
    assert.equal(body.ip, clientIp);
    await app.close();
  });

  it("sets security headers via Helmet", async () => {
    const app = await createServer(stubDb, stubCache, testEnv);
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");
    await app.close();
  });

  it("CORS defaults to deny-all; foreign Origin receives no allow header", async () => {
    const app = await createServer(stubDb, stubCache, { ...testEnv, CORS_ALLOWED_ORIGINS: "" });
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://evil.com" },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["access-control-allow-origin"], undefined);
    await app.close();
  });

  it("CORS permits allowlisted origins with credentials", async () => {
    const app = await createServer(stubDb, stubCache, {
      ...testEnv,
      CORS_ALLOWED_ORIGINS: "https://admin.example.com, https://app.example.com",
    });

    // Allowed origin
    const resAllowed = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://admin.example.com" },
    });
    assert.equal(resAllowed.headers["access-control-allow-origin"], "https://admin.example.com");
    assert.equal(resAllowed.headers["access-control-allow-credentials"], "true");

    // Denied origin
    const resDenied = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://unauthorized.com" },
    });
    assert.equal(resDenied.headers["access-control-allow-origin"], undefined);

    await app.close();
  });

  it("/health returns 200 status 'ok' when db and cache are alive", async () => {
    const app = await createServer(stubDb, stubCache, testEnv);
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { status: string; db: string; cache: string };
    assert.deepEqual(body, {
      status: "ok",
      db: "ok",
      cache: "ok",
    });
    await app.close();
  });

  it("/health returns 200 status 'degraded' when cache is down (never throws)", async () => {
    const degradedCache: ICache = {
      ...stubCache,
      isAlive: async () => false,
    };
    const app = await createServer(stubDb, degradedCache, testEnv);
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { status: string; db: string; cache: string };
    assert.deepEqual(body, {
      status: "degraded",
      db: "ok",
      cache: "down",
    });
    await app.close();
  });

  it("/health returns 200 status 'degraded' when db throws an error", async () => {
    const throwingDb: IDatabase = {
      ...stubDb,
      isAlive: async () => {
        throw new Error("DB connection timeout");
      },
    };
    const app = await createServer(throwingDb, stubCache, testEnv);
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { status: string; db: string; cache: string };
    assert.deepEqual(body, {
      status: "degraded",
      db: "down",
      cache: "ok",
    });
    await app.close();
  });

  it("boots with customManifest and resolvePluginManifest with debug logging", async () => {
    const debugLogs: string[] = [];
    const testLogger = {
      debug: (msg: string) => {
        debugLogs.push(msg);
      },
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    const resolved = await resolvePluginManifest(undefined, testLogger);
    assert.ok(resolved.length >= 2);
    assert.ok(debugLogs.some((l) => l.includes("Resolving available plugin manifests")));

    const app = await createServer(stubDb, stubCache, testEnv, resolved);
    assert.ok(app);
    await app.close();
  });
});
