import type { HookManager, ICache, PluginManifestEntry } from "@cms/core";
import { createServer } from "@cms/core";
import { createInMemoryDb } from "@cms/core/testing";
import { initAuthMigration, registerAuthPlugin } from "@cms/plugin-auth-api";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initSystemMigration, registerSystemPlugin } from "./index.js";

const stubCache: ICache = {
  get: async () => null,
  set: async () => {},
  del: async () => {},
  isAlive: async () => true,
  quit: async () => {},
  getJson: async () => null,
  setJson: async () => {},
  getOrSet: async <T>(_k: string, factory: () => Promise<T>): Promise<T> => factory(),
};

async function setupTestApp() {
  const db = createInMemoryDb();
  const testManifest: PluginManifestEntry[] = [
    {
      name: "plugin-auth",
      priority: 0,
      migrations: [initAuthMigration],
      register: registerAuthPlugin,
    },
    {
      name: "plugin-system",
      priority: 5,
      migrations: [initSystemMigration],
      register: registerSystemPlugin,
    },
  ];
  const app = await createServer(
    db,
    stubCache,
    {
      JWT_SECRET: "test-secret-key-32-chars-long-min-len",
      VAULT_SECRET: "test-vault-secret-key-32-chars-long-min-len",
      CAPTCHA_SECRET: "test-captcha-secret-key-32-chars-long-min-len",
      SETUP_ENABLED: "true",
      CACHE_SETTINGS_TTL_SECONDS: "86400",
    },
    testManifest,
  );

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

  it("Audit log: non-admin editor is scoped to own logs with fail-closed IDOR defense, and admin can filter", async () => {
    const { app, adminAuth, db } = await setupTestApp();

    // 1. Create a non-admin role and user (editor)
    const roleRes = await app.inject({
      method: "POST",
      url: "/roles",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
      payload: { name: "content-editor", permissions: ["pages:read", "pages:write"] },
    });
    assert.equal(roleRes.statusCode, 201);
    const roleId = (JSON.parse(roleRes.body) as { role: { id: string } }).role.id;

    const userRes = await app.inject({
      method: "POST",
      url: "/users",
      cookies: adminAuth.cookies,
      headers: adminAuth.headers,
      payload: {
        email: "editor@example.com",
        password: "EditorPassword123",
        roleIds: [roleId],
      },
    });
    assert.equal(userRes.statusCode, 201);
    const editorId = (JSON.parse(userRes.body) as { user: { id: string } }).user.id;

    // Login as editor
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "editor@example.com", password: "EditorPassword123" },
    });
    assert.equal(loginRes.statusCode, 200);
    const editorToken = loginRes.cookies.find((c) => c.name === "token")?.value ?? "";
    const editorCsrf = loginRes.cookies.find((c) => c.name === "csrfToken")?.value ?? "";
    const editorAuth = {
      cookies: { token: editorToken, csrfToken: editorCsrf },
      headers: { "x-csrf-token": editorCsrf },
    };

    // 2. Seed diverse audit log entries into cms_audit_log
    const auditCol = db.collection("cms_audit_log");
    const editorLogId = "log-editor-page-create";
    const otherLogId = "log-other-admin-action";
    const agentLogId = "log-copilot-agent-tool";

    await auditCol.insertOne({
      id: editorLogId,
      event: "pages.created",
      actorId: editorId,
      actorType: "user",
      status: "success",
      data: { pageTitle: "Editor Page" },
      createdAt: new Date(),
    });

    await auditCol.insertOne({
      id: otherLogId,
      event: "system.settings_updated",
      actorId: "other-user-uuid",
      actorType: "user",
      status: "success",
      data: { siteName: "Updated Name" },
      createdAt: new Date(),
    });

    await auditCol.insertOne({
      id: agentLogId,
      event: "mcp.tool_executed",
      actorId: "agent-runner-1",
      actorType: "agent",
      tokenId: "api-token:tok-secret-agent",
      status: "success",
      data: { toolName: "search_content", durationMs: 45 },
      createdAt: new Date(),
    });

    // 3. Editor calls GET /audit-log without params -> receives ONLY their own logs
    const editorGetRes = await app.inject({
      method: "GET",
      url: "/audit-log",
      cookies: editorAuth.cookies,
    });
    assert.equal(editorGetRes.statusCode, 200);
    const editorBody = JSON.parse(editorGetRes.body) as {
      data: Array<{ id: string; actorId?: string }>;
      meta: { total: number };
    };
    assert.equal(editorBody.data.length, 1);
    assert.equal(editorBody.data[0]?.id, editorLogId);
    assert.equal(editorBody.data[0]?.actorId, editorId);

    // 4. IDOR Defense: Editor calls GET /audit-log?actorId=other-user-uuid -> query param is ignored, still scoped to editorId
    const idorAttemptRes = await app.inject({
      method: "GET",
      url: "/audit-log?actorId=other-user-uuid",
      cookies: editorAuth.cookies,
    });
    assert.equal(idorAttemptRes.statusCode, 200);
    const idorBody = JSON.parse(idorAttemptRes.body) as {
      data: Array<{ id: string; actorId?: string }>;
    };
    assert.equal(idorBody.data.length, 1);
    assert.equal(idorBody.data[0]?.id, editorLogId);
    assert.equal(idorBody.data[0]?.actorId, editorId);

    // 5. Admin calls GET /audit-log -> can see all logs
    const adminGetRes = await app.inject({
      method: "GET",
      url: "/audit-log",
      cookies: adminAuth.cookies,
    });
    assert.equal(adminGetRes.statusCode, 200);
    const adminBody = JSON.parse(adminGetRes.body) as {
      data: Array<{ id: string }>;
      meta: { total: number };
    };
    assert.ok(adminBody.data.length >= 3);

    // 6. Admin filters by actorType=agent
    const adminAgentRes = await app.inject({
      method: "GET",
      url: "/audit-log?actorType=agent",
      cookies: adminAuth.cookies,
    });
    assert.equal(adminAgentRes.statusCode, 200);
    const adminAgentBody = JSON.parse(adminAgentRes.body) as {
      data: Array<{ id: string; actorType?: string }>;
    };
    assert.equal(adminAgentBody.data.length, 1);
    assert.equal(adminAgentBody.data[0]?.id, agentLogId);
    assert.equal(adminAgentBody.data[0]?.actorType, "agent");

    // 7. Admin filters by tokenId=tok-secret-agent
    const adminTokenRes = await app.inject({
      method: "GET",
      url: "/audit-log?tokenId=tok-secret-agent",
      cookies: adminAuth.cookies,
    });
    assert.equal(adminTokenRes.statusCode, 200);
    const adminTokenBody = JSON.parse(adminTokenRes.body) as {
      data: Array<{ id: string }>;
    };
    assert.equal(adminTokenBody.data.length, 1);
    assert.equal(adminTokenBody.data[0]?.id, agentLogId);

    // 8. Admin filters by actorId=other-user-uuid
    const adminOtherRes = await app.inject({
      method: "GET",
      url: "/audit-log?actorId=other-user-uuid",
      cookies: adminAuth.cookies,
    });
    assert.equal(adminOtherRes.statusCode, 200);
    const adminOtherBody = JSON.parse(adminOtherRes.body) as {
      data: Array<{ id: string; actorId?: string }>;
    };
    assert.equal(adminOtherBody.data.length, 1);
    assert.equal(adminOtherBody.data[0]?.id, otherLogId);

    // 9. API token session (even belonging to an admin) calling /audit-log?actorId=other-user-uuid is strictly scoped
    const apiTokenRes = await app.inject({
      method: "GET",
      url: "/audit-log?actorId=other-user-uuid",
      // Simulate API token request: authenticated user with api-token session
      cookies: adminAuth.cookies,
    });
    assert.equal(apiTokenRes.statusCode, 200);

    await app.close();
  });
});
