import type { ICollection, IDatabase } from "@cms/core";
import {
  ConfigService,
  HookManager,
  LogService,
  RedirectsService,
  SettingsService,
} from "@cms/core";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initAuthMigration, registerAuthPlugin } from "./index.js";

function makeInMemoryDb(): IDatabase {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();

  function getColStore(name: string) {
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
          const id = (doc["id"] as string) || (doc["key"] as string) || String(store.size + 1);
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
              (filter["id"] as string) || (filter["key"] as string) || String(store.size + 1);
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

async function setupTestApp(envOverrides: Record<string, string> = {}) {
  const db = makeInMemoryDb();
  const config = new ConfigService({
    JWT_SECRET: "test-super-secret-key-32-chars-long",
    LOG_LEVEL: "error",
    NODE_ENV: "test",
    ...envOverrides,
  });
  const logger = new LogService("error");
  const hooks = new HookManager();
  const settings = new SettingsService(db, logger);

  const app = Fastify({ logger: false });
  await app.register(cookie);
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  const dummyCache = {
    get: async () => null,
    set: async () => {},
    del: async () => {},
    isAlive: async () => true,
    quit: async () => {},
  };

  const redirects = new RedirectsService(db, logger);

  const services = {
    config,
    logger,
    db,
    cache: dummyCache,
    hooks,
    redirects,
    settings,
  };

  await initAuthMigration.up(db);
  await registerAuthPlugin(app, services);
  return { app, db, settings, hooks };
}

describe("plugin-auth routes & workflows", () => {
  it("setup wizard: GET /auth/setup returns needsSetup: true on empty db, POST /auth/setup creates admin and locks", async () => {
    const { app } = await setupTestApp();

    // Check status -> needsSetup: true
    const status1 = await app.inject({
      method: "GET",
      url: "/auth/setup",
    });
    assert.equal(status1.statusCode, 200);
    assert.deepEqual(JSON.parse(status1.body), { needsSetup: true, setupEnabled: true });

    // Perform initial setup
    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: {
        email: "admin@example.com",
        password: "AdminPassword123",
      },
    });

    assert.equal(setupRes.statusCode, 201);
    const body = JSON.parse(setupRes.body) as {
      user: { email: string; roleIds: string[]; permissions: string[] };
    };
    assert.equal(body.user.email, "admin@example.com");
    assert.equal(body.user.roleIds.length, 1);
    assert.deepEqual(body.user.permissions, ["*"]);
    assert.ok(setupRes.cookies.some((c) => c.name === "token" && c.httpOnly));
    assert.ok(setupRes.cookies.some((c) => c.name === "csrfToken" && !c.httpOnly));

    // Check status -> needsSetup: false
    const status2 = await app.inject({
      method: "GET",
      url: "/auth/setup",
    });
    assert.equal(status2.statusCode, 200);
    assert.deepEqual(JSON.parse(status2.body), { needsSetup: false, setupEnabled: true });

    // Second setup attempt must fail with 403 Forbidden
    const secondSetup = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: {
        email: "hacker@example.com",
        password: "HackerPassword123",
      },
    });
    assert.equal(secondSetup.statusCode, 403);
    assert.match(secondSetup.body, /Setup has already been completed/);

    await app.close();
  });

  it("setup wizard: rejects setup when SETUP_ENABLED is false in environment config", async () => {
    const { app } = await setupTestApp({ SETUP_ENABLED: "false" });

    const status = await app.inject({
      method: "GET",
      url: "/auth/setup",
    });
    assert.equal(status.statusCode, 200);
    assert.deepEqual(JSON.parse(status.body), { needsSetup: false, setupEnabled: false });

    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });
    assert.equal(setupRes.statusCode, 403);
    assert.match(setupRes.body, /Setup is disabled in environment configuration/);

    await app.close();
  });

  it("public registration strictly assigns roleIds: [] and ignores body roleIds", async () => {
    const { app } = await setupTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "regular@example.com",
        password: "UserPassword123",
        roleIds: ["admin", "hacker-role"], // Rule 29: must be ignored
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body) as {
      user: { email: string; roleIds: string[]; permissions: string[] };
    };
    assert.equal(body.user.email, "regular@example.com");
    assert.equal(body.user.roleIds.length, 0);
    assert.deepEqual(body.user.permissions, []);
    assert.ok(!res.body.includes("passwordHash")); // passwordHash never exposed

    await app.close();
  });

  it("admin creates new user via POST /users with custom roles", async () => {
    const { app } = await setupTestApp();

    // 1. Setup admin
    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });
    const adminToken = setupRes.cookies.find((c) => c.name === "token")!.value;
    const adminCsrf = setupRes.cookies.find((c) => c.name === "csrfToken")!.value;

    // 2. Admin creates a role
    const roleRes = await app.inject({
      method: "POST",
      url: "/roles",
      cookies: { token: adminToken, csrfToken: adminCsrf },
      headers: { "x-csrf-token": adminCsrf },
      payload: { name: "editor", permissions: ["pages:write", "blog:write"] },
    });
    assert.equal(roleRes.statusCode, 201);
    const roleObj = JSON.parse(roleRes.body) as { role: { id: string; name: string } };

    // 3. Admin creates user with the editor role
    const createUserRes = await app.inject({
      method: "POST",
      url: "/users",
      cookies: { token: adminToken, csrfToken: adminCsrf },
      headers: { "x-csrf-token": adminCsrf },
      payload: {
        email: "editor@example.com",
        password: "EditorPassword123",
        roleIds: [roleObj.role.id],
      },
    });
    assert.equal(createUserRes.statusCode, 201);
    const userBody = JSON.parse(createUserRes.body) as {
      user: { email: string; roleIds: string[] };
    };
    assert.equal(userBody.user.email, "editor@example.com");
    assert.deepEqual(userBody.user.roleIds, [roleObj.role.id]);

    await app.close();
  });

  it("login returns token & csrf cookies, and rejects invalid credentials", async () => {
    const { app } = await setupTestApp();

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "alice@example.com", password: "AlicePassword123" },
    });

    // Valid login
    const validLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "alice@example.com", password: "AlicePassword123" },
    });
    assert.equal(validLogin.statusCode, 200);
    assert.ok(validLogin.cookies.some((c) => c.name === "token" && c.httpOnly));
    assert.ok(validLogin.cookies.some((c) => c.name === "csrfToken" && !c.httpOnly));

    // Invalid password
    const badPass = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "alice@example.com", password: "WrongPassword123" },
    });
    assert.equal(badPass.statusCode, 401);

    // Non-existent user
    const unknownUser = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "nobody@example.com", password: "SomePassword123" },
    });
    assert.equal(unknownUser.statusCode, 401);

    await app.close();
  });

  it("verifyCsrf fails closed when cookie and header mismatch on state-changing requests", async () => {
    const { app } = await setupTestApp();

    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "csrf-user@example.com", password: "CsrfUserPass123" },
    });
    const tokenCookie = reg.cookies.find((c) => c.name === "token")!;
    const csrfCookie = reg.cookies.find((c) => c.name === "csrfToken")!;

    // Logout with wrong CSRF header -> 403 Forbidden
    const csrfFail = await app.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: { token: tokenCookie.value, csrfToken: csrfCookie.value },
      headers: { "x-csrf-token": "wrong-token" },
    });
    assert.equal(csrfFail.statusCode, 403);

    // Logout with matching CSRF header -> 200 OK
    const csrfPass = await app.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: { token: tokenCookie.value, csrfToken: csrfCookie.value },
      headers: { "x-csrf-token": csrfCookie.value },
    });
    assert.equal(csrfPass.statusCode, 200);

    await app.close();
  });

  it("auth.registrationEnabled toggled to false immediately returns 403 on register without restart", async () => {
    const { app } = await setupTestApp();

    // Setup initial admin
    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });
    const token = setupRes.cookies.find((c) => c.name === "token")!.value;
    const csrf = setupRes.cookies.find((c) => c.name === "csrfToken")!.value;

    // Admin disables registration
    const updateRes = await app.inject({
      method: "PUT",
      url: "/auth/settings",
      cookies: { token, csrfToken: csrf },
      headers: { "x-csrf-token": csrf },
      payload: { registrationEnabled: false },
    });
    assert.equal(updateRes.statusCode, 200);

    // Next user attempts registration -> 403
    const blockedRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "blocked@example.com", password: "Password123" },
    });
    assert.equal(blockedRes.statusCode, 403);
    assert.match(blockedRes.body, /Registration is currently disabled/);

    await app.close();
  });

  it("DELETE /users/:id/sessions revokes target user's sessions", async () => {
    const { app } = await setupTestApp();

    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });
    const adminToken = setupRes.cookies.find((c) => c.name === "token")!.value;
    const adminCsrf = setupRes.cookies.find((c) => c.name === "csrfToken")!.value;

    const user = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "user@example.com", password: "UserPassword123" },
    });
    const userObj = JSON.parse(user.body) as { user: { id: string } };
    const userToken = user.cookies.find((c) => c.name === "token")!.value;

    // User is authenticated
    const meBefore = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: userToken },
    });
    assert.equal(meBefore.statusCode, 200);

    // Admin revokes user sessions
    const revokeRes = await app.inject({
      method: "DELETE",
      url: `/users/${userObj.user.id}/sessions`,
      cookies: { token: adminToken, csrfToken: adminCsrf },
      headers: { "x-csrf-token": adminCsrf },
    });
    assert.equal(revokeRes.statusCode, 200);

    // User token now rejected with 401
    const meAfter = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: userToken },
    });
    assert.equal(meAfter.statusCode, 401);

    await app.close();
  });

  it("POST /auth/sessions/revoke-all revokes all sessions and requires auth:sessions:revoke_all permission", async () => {
    const { app } = await setupTestApp();

    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });
    const adminToken = setupRes.cookies.find((c) => c.name === "token")!.value;
    const adminCsrf = setupRes.cookies.find((c) => c.name === "csrfToken")!.value;

    // Trigger panic button
    const panicRes = await app.inject({
      method: "POST",
      url: "/auth/sessions/revoke-all",
      cookies: { token: adminToken, csrfToken: adminCsrf },
      headers: { "x-csrf-token": adminCsrf },
    });
    assert.equal(panicRes.statusCode, 200);

    // Even admin's own session is now invalidated
    const meCheck = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: adminToken },
    });
    assert.equal(meCheck.statusCode, 401);

    await app.close();
  });
});
