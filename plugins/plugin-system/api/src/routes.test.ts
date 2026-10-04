import type { HookManager, ICollection, IDatabase } from "@cms/core";
import { createServer } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

function makeStubDb(): IDatabase {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();

  function getColStore(name: string): Map<string, Record<string, unknown>> {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    return collections.get(name)!;
  }

  const db: IDatabase = {
    connect: async () => {},
    disconnect: async () => {},
    isAlive: async () => true,
    collection: <T extends Record<string, unknown>>(name: string): ICollection<T> => {
      const store = getColStore(name);

      return {
        findOne: async (filter: Record<string, unknown>) => {
          for (const doc of store.values()) {
            let match = true;
            for (const [k, v] of Object.entries(filter)) {
              if (doc[k] !== v) {
                match = false;
                break;
              }
            }
            if (match) return { ...doc } as unknown as T;
          }
          return null;
        },
        find: async (filter: Record<string, unknown> = {}, options = {}) => {
          let docs = Array.from(store.values());
          if (Object.keys(filter).length > 0) {
            docs = docs.filter((doc) => {
              for (const [k, v] of Object.entries(filter)) {
                if (k === "id" && typeof v === "object" && v !== null && "$in" in v) {
                  const ids = (v as { $in: string[] })["$in"];
                  if (!ids.includes(doc["id"] as string)) return false;
                } else if (doc[k] !== v) {
                  return false;
                }
              }
              return true;
            });
          }
          if (options.skip) docs = docs.slice(options.skip);
          if (options.limit) docs = docs.slice(0, options.limit);
          return docs.map((d) => ({ ...d })) as unknown as T[];
        },
        insertOne: async (doc: Record<string, unknown>) => {
          const id =
            (doc["id"] as string) ||
            (doc["key"] as string) ||
            (doc["name"] as string) ||
            String(store.size + 1);
          store.set(id, { ...doc, id });
        },
        updateOne: async (
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
          options = {},
        ) => {
          let targetId: string | null = null;
          for (const [id, doc] of store.entries()) {
            let match = true;
            for (const [k, v] of Object.entries(filter)) {
              if (doc[k] !== v) {
                match = false;
                break;
              }
            }
            if (match) {
              targetId = id;
              break;
            }
          }

          if (!targetId && options.upsert) {
            targetId =
              (filter["id"] as string) ||
              (filter["key"] as string) ||
              (filter["name"] as string) ||
              String(store.size + 1);
            store.set(targetId, { ...filter, id: targetId });
          }

          if (targetId) {
            const existing = store.get(targetId)!;
            if (update["$set"]) {
              Object.assign(existing, update["$set"]);
            } else {
              Object.assign(existing, update);
            }
          }
        },
        deleteOne: async (filter: Record<string, unknown>) => {
          if (Object.keys(filter).length === 0) {
            store.clear();
            return;
          }
          for (const [id, doc] of store.entries()) {
            let match = true;
            for (const [k, v] of Object.entries(filter)) {
              if (doc[k] !== v) {
                match = false;
                break;
              }
            }
            if (match) {
              store.delete(id);
              return;
            }
          }
        },
        countDocuments: async () => store.size,
        createIndex: async () => {},
      };
    },
  };

  return db;
}

const stubCache = {
  get: async () => null,
  set: async () => {},
  del: async () => {},
  isAlive: async () => true,
  quit: async () => {},
};

async function setupTestApp() {
  const db = makeStubDb();
  const app = await createServer(db, stubCache, {
    JWT_SECRET: "test-secret-key-32-chars-long-min-len",
    VAULT_SECRET: "test-vault-secret-key-32-chars-long-min-len",
    CAPTCHA_SECRET: "test-captcha-secret-key-32-chars-long-min-len",
    SETUP_ENABLED: "true",
  });

  // Setup initial admin account
  const setupRes = await app.inject({
    method: "POST",
    url: "/auth/setup",
    payload: { email: "admin@example.com", password: "AdminPassword123" },
  });

  if (setupRes.statusCode !== 201) {
    throw new Error(`Setup failed with status ${setupRes.statusCode}: ${setupRes.body}`);
  }

  const adminToken = setupRes.cookies.find((c) => c.name === "token")?.value ?? "";
  const adminCsrf = setupRes.cookies.find((c) => c.name === "csrfToken")?.value ?? "";

  const adminAuth = {
    cookies: { token: adminToken, csrfToken: adminCsrf },
    headers: { "x-csrf-token": adminCsrf },
  };

  return { app, db, adminAuth };
}

describe("plugin-system routes & workflows", () => {
  it("togglePlugin -> reloadStates() -> proven via real 503 HTTP check", async () => {
    const { app, adminAuth } = await setupTestApp();

    // 1. List plugins
    const listRes = await app.inject({
      method: "GET",
      url: "/plugins",
      cookies: adminAuth.cookies,
    });
    assert.equal(listRes.statusCode, 200);

    // 2. Toggle plugin-auth to disabled
    const toggleRes = await app.inject({
      method: "PUT",
      url: "/plugins/plugin-auth",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
      payload: { enabled: false },
    });
    assert.equal(toggleRes.statusCode, 200);
    assert.equal(JSON.parse(toggleRes.body).plugin.enabled, false);

    // 3. Subsequent request to disabled plugin route returns 503 immediately
    const disabledRes = await app.inject({
      method: "GET",
      url: "/auth/setup",
    });
    assert.equal(disabledRes.statusCode, 503);

    await app.close();
  });

  it("Settings upsert: rejects non-hex color with 400 and updates brand settings", async () => {
    const { app, adminAuth } = await setupTestApp();

    // 1. Initial GET /settings
    const getRes = await app.inject({
      method: "GET",
      url: "/settings",
      cookies: adminAuth.cookies,
    });
    const parsedBody = JSON.parse(getRes.body) as { settings: Record<string, unknown> };
    assert.equal(parsedBody.settings["brandColor"], "#3b82f6");
    assert.equal(parsedBody.settings["brandFont"], "Inter");

    // 2. PUT with invalid hex color -> 400 ValidationError
    const invalidRes = await app.inject({
      method: "PUT",
      url: "/settings",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
      payload: { brandColor: "not-a-hex" },
    });
    assert.equal(invalidRes.statusCode, 400);

    // 3. PUT with valid hex color -> 200
    const validRes = await app.inject({
      method: "PUT",
      url: "/settings",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
      payload: { brandColor: "#10b981", brandFont: "Roboto" },
    });
    assert.equal(validRes.statusCode, 200);
    const updatedBody = JSON.parse(validRes.body) as { settings: Record<string, unknown> };
    assert.equal(updatedBody.settings["brandColor"], "#10b981");
    assert.equal(updatedBody.settings["brandFont"], "Roboto");

    await app.close();
  });

  it("GET /feature-flags is public and unauthenticated; CRUD requires auth+csrf", async () => {
    const { app, adminAuth } = await setupTestApp();

    // 1. Public GET /feature-flags without cookies
    const publicGet = await app.inject({
      method: "GET",
      url: "/feature-flags",
    });
    assert.equal(publicGet.statusCode, 200);
    assert.deepEqual(JSON.parse(publicGet.body), { flags: [] });

    // 2. Unauthenticated POST /feature-flags fails closed with 401
    const unauthPost = await app.inject({
      method: "POST",
      url: "/feature-flags",
      payload: { key: "beta_checkout", label: "Beta Checkout", value: true },
    });
    assert.equal(unauthPost.statusCode, 401);

    // 3. Authenticated POST /feature-flags
    const createRes = await app.inject({
      method: "POST",
      url: "/feature-flags",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
      payload: {
        key: "beta_checkout",
        label: "Beta Checkout",
        description: "New cart flow",
        value: true,
      },
    });
    assert.equal(createRes.statusCode, 201);
    const createdFlag = JSON.parse(createRes.body).flag;
    assert.equal(createdFlag.key, "beta_checkout");
    assert.equal(createdFlag.value, true);

    // 4. Public GET now reflects the flag
    const publicGet2 = await app.inject({
      method: "GET",
      url: "/feature-flags",
    });
    assert.equal(publicGet2.statusCode, 200);
    assert.equal(JSON.parse(publicGet2.body).flags.length, 1);

    // 5. Update flag
    const updateRes = await app.inject({
      method: "PUT",
      url: "/feature-flags/beta_checkout",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
      payload: { value: false },
    });
    assert.equal(updateRes.statusCode, 200);
    assert.equal(JSON.parse(updateRes.body).flag.value, false);

    // 6. Delete flag
    const deleteRes = await app.inject({
      method: "DELETE",
      url: "/feature-flags/beta_checkout",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
    });
    assert.equal(deleteRes.statusCode, 200);

    await app.close();
  });

  it("Audit log: automatically records events and GET /audit-log has no write counterpart", async () => {
    const { app, adminAuth } = await setupTestApp();

    // Emit event (from any plugin)
    await (app as unknown as { hooks: HookManager }).hooks.emit("plugin.toggled", {
      name: "plugin-media",
      enabled: false,
      actorId: "admin-1",
    });

    // 1. GET /audit-log is paginated and authenticated
    const logRes = await app.inject({
      method: "GET",
      url: "/audit-log",
      cookies: adminAuth.cookies,
    });
    assert.equal(logRes.statusCode, 200);
    const body = JSON.parse(logRes.body);
    assert.ok(body.data.length >= 1);
    assert.ok(body.data.some((e: Record<string, unknown>) => e["event"] === "plugin.toggled"));

    // 2. Audit log has NO write / delete endpoints (404)
    const postRes = await app.inject({
      method: "POST",
      url: "/audit-log",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
      payload: { event: "fake" },
    });
    assert.equal(postRes.statusCode, 404);

    const delRes = await app.inject({
      method: "DELETE",
      url: "/audit-log",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
    });
    assert.equal(delRes.statusCode, 404);

    await app.close();
  });
});
