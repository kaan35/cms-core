import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createServer } from "./createServer.js";
import { NotFoundError } from "./errors/AppError.js";
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
  collection: <T extends Record<string, unknown>>(): ICollection<T> =>
    makeStubCollection() as unknown as ICollection<T>,
};

const stubCache: ICache = {
  get: async () => null,
  set: async () => {},
  del: async () => {},
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
});
