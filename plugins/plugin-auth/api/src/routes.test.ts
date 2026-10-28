import type { ICollection, IDatabase } from "@cms/core";
import {
  ConfigService,
  HookManager,
  LogService,
  PERMISSIONS,
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
              if (Array.isArray(filter["$or"])) {
                return (filter["$or"] as Record<string, unknown>[]).some((subFilter) => {
                  return Object.entries(subFilter).every(([k, v]) => {
                    if (typeof v === "object" && v !== null && "$in" in v) {
                      const ids = (v as { $in: string[] })["$in"];
                      return ids.includes(doc[k] as string);
                    }
                    return doc[k] === v;
                  });
                });
              }
              for (const [k, v] of Object.entries(filter)) {
                if (typeof v === "object" && v !== null && "$in" in v) {
                  const ids = (v as { $in: string[] })["$in"];
                  if (!ids.includes(doc[k] as string)) return false;
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
    getJson: async () => null,
    set: async () => {},
    setJson: async () => {},
    del: async () => {},
    getOrSet: async <T>(_key: string, factory: () => Promise<T>) => factory(),
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
        roleIds: ["admin", "hacker-role"], // Disallowed role escalation: must be ignored
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
      payload: { name: "content-editor", permissions: ["pages:write", "blog:write"] },
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

    // Admin lists user sessions
    const listRes = await app.inject({
      method: "GET",
      url: `/users/${userObj.user.id}/sessions`,
      cookies: { token: adminToken },
    });
    assert.equal(listRes.statusCode, 200);
    const sessionsList = JSON.parse(listRes.body) as {
      sessions: Array<{ id: string; status: string }>;
    };
    assert.equal(sessionsList.sessions.length, 1);
    assert.equal(sessionsList.sessions[0]?.status, "active");

    // Admin revokes specific user session
    const revokeSingleRes = await app.inject({
      method: "DELETE",
      url: `/users/${userObj.user.id}/sessions/${sessionsList.sessions[0]!.id}`,
      cookies: { token: adminToken, csrfToken: adminCsrf },
      headers: { "x-csrf-token": adminCsrf },
    });
    assert.equal(revokeSingleRes.statusCode, 200);

    // User token now rejected with 401
    const meAfter = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: userToken },
    });
    assert.equal(meAfter.statusCode, 401);

    // Admin checks history: session is now listed as revoked with admin_revoked
    const listHistoryRes = await app.inject({
      method: "GET",
      url: `/users/${userObj.user.id}/sessions`,
      cookies: { token: adminToken },
    });
    assert.equal(listHistoryRes.statusCode, 200);
    const historyList = JSON.parse(listHistoryRes.body) as {
      sessions: Array<{ id: string; status: string; revokeReason?: string }>;
    };
    assert.equal(historyList.sessions.length, 1);
    assert.equal(historyList.sessions[0]?.status, "revoked");
    assert.equal(historyList.sessions[0]?.revokeReason, "admin_revoked");

    await app.close();
  });

  it("audit: GET /users/:id/sessions allows admin to view sessions and rejects unauthorized users with 403", async () => {
    const { app } = await setupTestApp();

    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });
    const adminToken = setupRes.cookies.find((c) => c.name === "token")!.value;

    // Register regular user Bob (has active session)
    const bobRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "bob@example.com", password: "BobPassword123" },
    });
    const bobObj = JSON.parse(bobRes.body) as { user: { id: string } };

    // Register regular user Alice (unauthorized, permissions: [])
    const aliceRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "alice@example.com", password: "AlicePassword123" },
    });
    const aliceToken = aliceRes.cookies.find((c) => c.name === "token")!.value;

    // 1. Unauthenticated request -> 401 Unauthorized
    const unauthRes = await app.inject({
      method: "GET",
      url: `/users/${bobObj.user.id}/sessions`,
    });
    assert.equal(unauthRes.statusCode, 401);

    // 2. Unauthorized request (Alice lacking users:read) -> 403 Forbidden
    const forbiddenRes = await app.inject({
      method: "GET",
      url: `/users/${bobObj.user.id}/sessions`,
      cookies: { token: aliceToken },
    });
    assert.equal(forbiddenRes.statusCode, 403);
    assert.match(forbiddenRes.body, /missing required permission 'users:read'/);

    // 3. Admin request -> 200 OK with active sessions
    const adminRes = await app.inject({
      method: "GET",
      url: `/users/${bobObj.user.id}/sessions`,
      cookies: { token: adminToken },
    });
    assert.equal(adminRes.statusCode, 200);
    const body = JSON.parse(adminRes.body) as {
      sessions: Array<{ id: string; status: string }>;
    };
    assert.equal(body.sessions.length, 1);
    assert.equal(body.sessions[0]?.status, "active");

    await app.close();
  });

  it("audit: DELETE /users/:id/sessions/:sessionId terminates single session with admin_revoked and rejects unauthorized users with 403", async () => {
    const { app } = await setupTestApp();

    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });
    const adminToken = setupRes.cookies.find((c) => c.name === "token")!.value;
    const adminCsrf = setupRes.cookies.find((c) => c.name === "csrfToken")!.value;

    const bobRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "bob@example.com", password: "BobPassword123" },
    });
    const bobObj = JSON.parse(bobRes.body) as { user: { id: string } };
    const bobToken = bobRes.cookies.find((c) => c.name === "token")!.value;

    const aliceRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "alice@example.com", password: "AlicePassword123" },
    });
    const aliceToken = aliceRes.cookies.find((c) => c.name === "token")!.value;
    const aliceCsrf = aliceRes.cookies.find((c) => c.name === "csrfToken")!.value;

    // Bob can authenticate
    const meBefore = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: bobToken },
    });
    assert.equal(meBefore.statusCode, 200);

    // Get Bob's sessionId
    const listRes = await app.inject({
      method: "GET",
      url: `/users/${bobObj.user.id}/sessions`,
      cookies: { token: adminToken },
    });
    const bobSessionId = (JSON.parse(listRes.body) as { sessions: Array<{ id: string }> })
      .sessions[0]!.id;

    // 1. Unauthorized user (Alice lacking users:write) -> 403 Forbidden
    const forbiddenRes = await app.inject({
      method: "DELETE",
      url: `/users/${bobObj.user.id}/sessions/${bobSessionId}`,
      cookies: { token: aliceToken, csrfToken: aliceCsrf },
      headers: { "x-csrf-token": aliceCsrf },
    });
    assert.equal(forbiddenRes.statusCode, 403);
    assert.match(forbiddenRes.body, /missing required permission 'users:write'/);

    // 2. Admin terminates Bob's session -> 200 OK
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/users/${bobObj.user.id}/sessions/${bobSessionId}`,
      cookies: { token: adminToken, csrfToken: adminCsrf },
      headers: { "x-csrf-token": adminCsrf },
    });
    assert.equal(deleteRes.statusCode, 200);

    // 3. Bob's terminated token now fails with 401 Unauthorized
    const meAfter = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: bobToken },
    });
    assert.equal(meAfter.statusCode, 401);

    // 4. Admin inspects history: status is "revoked" and revokeReason is "admin_revoked"
    const historyRes = await app.inject({
      method: "GET",
      url: `/users/${bobObj.user.id}/sessions`,
      cookies: { token: adminToken },
    });
    const historyBody = JSON.parse(historyRes.body) as {
      sessions: Array<{ id: string; status: string; revokeReason?: string }>;
    };
    assert.equal(historyBody.sessions.length, 1);
    assert.equal(historyBody.sessions[0]?.id, bobSessionId);
    assert.equal(historyBody.sessions[0]?.status, "revoked");
    assert.equal(historyBody.sessions[0]?.revokeReason, "admin_revoked");

    await app.close();
  });

  it("audit: POST /users/:id/sessions/revoke-all terminates all sessions for user and rejects unauthorized users with 403", async () => {
    const { app } = await setupTestApp();

    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });
    const adminToken = setupRes.cookies.find((c) => c.name === "token")!.value;
    const adminCsrf = setupRes.cookies.find((c) => c.name === "csrfToken")!.value;

    // Register Bob
    const bobRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "bob@example.com", password: "BobPassword123" },
    });
    const bobObj = JSON.parse(bobRes.body) as { user: { id: string } };
    const bobToken1 = bobRes.cookies.find((c) => c.name === "token")!.value;

    // Bob logs in a second time -> second session
    const bobLogin2 = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "bob@example.com", password: "BobPassword123" },
    });
    const bobToken2 = bobLogin2.cookies.find((c) => c.name === "token")!.value;

    // Register Alice (unauthorized)
    const aliceRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "alice@example.com", password: "AlicePassword123" },
    });
    const aliceToken = aliceRes.cookies.find((c) => c.name === "token")!.value;
    const aliceCsrf = aliceRes.cookies.find((c) => c.name === "csrfToken")!.value;

    // Verify Bob's both sessions active
    const me1 = await app.inject({ method: "GET", url: "/auth/me", cookies: { token: bobToken1 } });
    assert.equal(me1.statusCode, 200);
    const me2 = await app.inject({ method: "GET", url: "/auth/me", cookies: { token: bobToken2 } });
    assert.equal(me2.statusCode, 200);

    // 1. Unauthorized caller (Alice lacking users:write) -> 403 Forbidden
    const forbiddenRes = await app.inject({
      method: "POST",
      url: `/users/${bobObj.user.id}/sessions/revoke-all`,
      cookies: { token: aliceToken, csrfToken: aliceCsrf },
      headers: { "x-csrf-token": aliceCsrf },
    });
    assert.equal(forbiddenRes.statusCode, 403);
    assert.match(forbiddenRes.body, /missing required permission 'users:write'/);

    // 2. Admin revokes all of Bob's sessions -> 200 OK
    const revokeAllRes = await app.inject({
      method: "POST",
      url: `/users/${bobObj.user.id}/sessions/revoke-all`,
      cookies: { token: adminToken, csrfToken: adminCsrf },
      headers: { "x-csrf-token": adminCsrf },
    });
    assert.equal(revokeAllRes.statusCode, 200);

    // 3. Both of Bob's tokens now return 401 Unauthorized
    const me1After = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: bobToken1 },
    });
    assert.equal(me1After.statusCode, 401);

    const me2After = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: bobToken2 },
    });
    assert.equal(me2After.statusCode, 401);

    // 4. Admin's session is unaffected
    const adminCheck = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: adminToken },
    });
    assert.equal(adminCheck.statusCode, 200);

    // 5. Admin lists history: all Bob's sessions are revoked with admin_revoked
    const historyRes = await app.inject({
      method: "GET",
      url: `/users/${bobObj.user.id}/sessions`,
      cookies: { token: adminToken },
    });
    const historyBody = JSON.parse(historyRes.body) as {
      sessions: Array<{ id: string; status: string; revokeReason?: string }>;
    };
    assert.equal(historyBody.sessions.length, 2);
    for (const session of historyBody.sessions) {
      assert.equal(session.status, "revoked");
      assert.equal(session.revokeReason, "admin_revoked");
    }

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

  it("enforces fail-closed boot when JWT_SECRET is missing or < 32 characters", async () => {
    const originalEnv = process.env["JWT_SECRET"];
    delete process.env["JWT_SECRET"];

    try {
      await assert.rejects(
        async () => setupTestApp({ JWT_SECRET: "" }),
        /JWT_SECRET is required and must be at least 32 characters long\. Boot failed\./,
      );

      await assert.rejects(
        async () => setupTestApp({ JWT_SECRET: "short-secret" }),
        /JWT_SECRET is required and must be at least 32 characters long\. Boot failed\./,
      );
    } finally {
      if (originalEnv !== undefined) {
        process.env["JWT_SECRET"] = originalEnv;
      } else {
        delete process.env["JWT_SECRET"];
      }
    }
  });

  it("audit: schemeless or malformed Authorization header fails closed with 401 Unauthorized", async () => {
    const { app } = await setupTestApp();

    // 1. Basic auth scheme
    const basicRes = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    assert.equal(basicRes.statusCode, 401);

    // 2. Token auth scheme
    const tokenRes = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Token some-opaque-token" },
    });
    assert.equal(tokenRes.statusCode, 401);

    // 3. Bare Bearer without token
    const bareBearerRes = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Bearer" },
    });
    assert.equal(bareBearerRes.statusCode, 401);

    // 4. Bearer with whitespace only
    const whitespaceBearerRes = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Bearer    " },
    });
    assert.equal(whitespaceBearerRes.statusCode, 401);

    // 5. Raw token without scheme prefix
    const rawTokenRes = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "raw-token-without-bearer-prefix" },
    });
    assert.equal(rawTokenRes.statusCode, 401);

    await app.close();
  });

  it("audit: BOLA / IDOR defense: DELETE /auth/sessions/:id blocks regular user from revoking another user's session with 403", async () => {
    const { app } = await setupTestApp();

    // Admin setup
    await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });

    // Register User Bob
    const bobRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "bob@example.com", password: "BobPassword123" },
    });
    const bobToken = bobRes.cookies.find((c) => c.name === "token")!.value;

    // Bob inspects his session ID
    const bobSessionsRes = await app.inject({
      method: "GET",
      url: "/auth/sessions",
      cookies: { token: bobToken },
    });
    const bobSessions = JSON.parse(bobSessionsRes.body) as { sessions: Array<{ id: string }> };
    const bobSessionId = bobSessions.sessions[0]!.id;

    // Register User Alice (attacker)
    const aliceRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "alice@example.com", password: "AlicePassword123" },
    });
    const aliceToken = aliceRes.cookies.find((c) => c.name === "token")!.value;
    const aliceCsrf = aliceRes.cookies.find((c) => c.name === "csrfToken")!.value;

    // Alice inspects her own session ID
    const aliceSessionsRes = await app.inject({
      method: "GET",
      url: "/auth/sessions",
      cookies: { token: aliceToken },
    });
    const aliceSessions = JSON.parse(aliceSessionsRes.body) as { sessions: Array<{ id: string }> };
    const aliceSessionId = aliceSessions.sessions[0]!.id;

    // 1. Adversarial BOLA: Alice attempts to DELETE Bob's session via /auth/sessions/:id
    const bolaAttackRes = await app.inject({
      method: "DELETE",
      url: `/auth/sessions/${bobSessionId}`,
      cookies: { token: aliceToken, csrfToken: aliceCsrf },
      headers: { "x-csrf-token": aliceCsrf },
    });
    assert.equal(bolaAttackRes.statusCode, 403);
    assert.match(bolaAttackRes.body, /You can only delete your own sessions/);

    // Bob's session is still active and valid
    const bobMeCheck = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: bobToken },
    });
    assert.equal(bobMeCheck.statusCode, 200);

    // 2. Alice CAN legitimately delete her OWN session
    const aliceSelfDeleteRes = await app.inject({
      method: "DELETE",
      url: `/auth/sessions/${aliceSessionId}`,
      cookies: { token: aliceToken, csrfToken: aliceCsrf },
      headers: { "x-csrf-token": aliceCsrf },
    });
    assert.equal(aliceSelfDeleteRes.statusCode, 200);

    // Alice's token is now revoked
    const aliceMeCheck = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: aliceToken },
    });
    assert.equal(aliceMeCheck.statusCode, 401);

    await app.close();
  });

  it("audit: Granular RBAC boundary check: user with pages permissions CANNOT access navigation or user management routes", async () => {
    const { app } = await setupTestApp();

    // Attach dummy navigation route to test RBAC boundary BEFORE first inject
    app.get(
      "/navigation",
      {
        preHandler: [app.authenticate, app.checkPermission(PERMISSIONS.NAVIGATION.READ)],
      },
      async () => ({ items: [] }),
    );

    // Setup admin
    const setupRes = await app.inject({
      method: "POST",
      url: "/auth/setup",
      payload: { email: "admin@example.com", password: "AdminPassword123" },
    });
    const adminToken = setupRes.cookies.find((c) => c.name === "token")!.value;
    const adminCsrf = setupRes.cookies.find((c) => c.name === "csrfToken")!.value;

    // Create role with only pages:read and pages:write
    const roleRes = await app.inject({
      method: "POST",
      url: "/roles",
      cookies: { token: adminToken, csrfToken: adminCsrf },
      headers: { "x-csrf-token": adminCsrf },
      payload: { name: "page-author", permissions: ["pages:read", "pages:write"] },
    });
    const roleObj = JSON.parse(roleRes.body) as { role: { id: string } };

    // Create user with page-author role
    await app.inject({
      method: "POST",
      url: "/users",
      cookies: { token: adminToken, csrfToken: adminCsrf },
      headers: { "x-csrf-token": adminCsrf },
      payload: {
        email: "author@example.com",
        password: "AuthorPassword123",
        roleIds: [roleObj.role.id],
      },
    });

    // Author logs in
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "author@example.com", password: "AuthorPassword123" },
    });
    const authorToken = loginRes.cookies.find((c) => c.name === "token")!.value;

    // 1. Author attempting GET /navigation -> 403 Forbidden
    const navRes = await app.inject({
      method: "GET",
      url: "/navigation",
      cookies: { token: authorToken },
    });
    assert.equal(navRes.statusCode, 403);
    assert.match(navRes.body, /missing required permission 'navigation:read'/);

    // 2. Author attempting GET /users -> 403 Forbidden
    const usersRes = await app.inject({
      method: "GET",
      url: "/users",
      cookies: { token: authorToken },
    });
    assert.equal(usersRes.statusCode, 403);
    assert.match(usersRes.body, /missing required permission 'users:read'/);

    // 3. Admin attempting GET /navigation -> 200 OK
    const adminNavRes = await app.inject({
      method: "GET",
      url: "/navigation",
      cookies: { token: adminToken },
    });
    assert.equal(adminNavRes.statusCode, 200);

    await app.close();
  });
});
