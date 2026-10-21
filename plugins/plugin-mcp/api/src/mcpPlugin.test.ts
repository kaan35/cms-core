import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { EVENTS, type CoreServices } from "@cms/core";
import { registerMcpPlugin } from "./index.js";

describe("MCP Plugin Suite", () => {
  it("rejects requests without Authorization header with 401 Unauthorized", async () => {
    const app = Fastify();
    await registerMcpPlugin(app, {} as CoreServices);

    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      },
    });

    assert.strictEqual(response.statusCode, 401);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, "Valid API token required via Authorization: Bearer header");
  });

  it("rejects requests with malformed Authorization header with 401 Unauthorized", async () => {
    const app = Fastify();
    await registerMcpPlugin(app, {} as CoreServices);

    const response = await app.inject({
      method: "GET",
      url: "/api/mcp",
      headers: {
        authorization: "Basic dXNlcjpwYXNz",
      },
    });

    assert.strictEqual(response.statusCode, 401);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, "Valid API token required via Authorization: Bearer header");
  });

  it("handles valid Bearer token and responds through MCP transport", async () => {
    const prevKey = process.env["CMS_API_KEY"];
    process.env["CMS_API_KEY"] = "test-api-key";
    try {
      const app = Fastify();
      await registerMcpPlugin(app, {} as CoreServices);

      const response = await app.inject({
        method: "POST",
        url: "/api/mcp",
        headers: {
          authorization: "Bearer test-api-key",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        payload: {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const dataLine = response.body.split("\n").find((line: string) => line.startsWith("data: "));
      const payloadStr = dataLine ? dataLine.slice(6).trim() : response.body;
      const body = JSON.parse(payloadStr);
      assert.strictEqual(body.jsonrpc, "2.0");
      assert.strictEqual(body.id, 1);
      assert.ok(body.result, "Should return initialize result");
      assert.strictEqual(body.result.serverInfo.name, "cms-mcp");
      assert.strictEqual(body.result.serverInfo.version, "0.1.0");
    } finally {
      if (prevKey === undefined) {
        delete process.env["CMS_API_KEY"];
      } else {
        process.env["CMS_API_KEY"] = prevKey;
      }
    }
  });

  it("rejects requests with raw token missing Bearer prefix with 401 Unauthorized", async () => {
    const app = Fastify();
    await registerMcpPlugin(app, {} as CoreServices);

    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: {
        authorization: "cms_token_test_agent_secret_key_123",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      payload: {
        jsonrpc: "2.0",
        id: 2,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      },
    });

    assert.strictEqual(response.statusCode, 401);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, "Valid API token required via Authorization: Bearer header");
  });

  it("emits EVENTS.MCP.TOOL_EXECUTED with status 'success' on successful tool call", async () => {
    const prevKey = process.env["CMS_API_KEY"];
    process.env["CMS_API_KEY"] = "test-api-key";
    try {
      const app = Fastify();
      const emittedEvents: Array<{ event: string; payload: Record<string, unknown> }> = [];
      (
        app as unknown as {
          hooks: { emit: (event: string, payload: unknown) => Promise<void> };
        }
      ).hooks = {
        emit: async (event: string, payload: unknown) => {
          emittedEvents.push({ event, payload: payload as Record<string, unknown> });
        },
      };

      await registerMcpPlugin(app, {} as CoreServices);

      const response = await app.inject({
        method: "POST",
        url: "/api/mcp",
        headers: {
          authorization: "Bearer test-api-key",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        payload: {
          jsonrpc: "2.0",
          id: 10,
          method: "tools/call",
          params: {
            name: "suggest_seo_metadata",
            arguments: {
              title: "Optimizing Web Performance",
            },
          },
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const toolEvent = emittedEvents.find((e) => e.event === EVENTS.MCP.TOOL_EXECUTED);
      assert.ok(toolEvent, "Should emit EVENTS.MCP.TOOL_EXECUTED");
      assert.strictEqual(toolEvent.payload["status"], "success");
      assert.strictEqual(toolEvent.payload["tool"], "suggest_seo_metadata");
      assert.strictEqual(toolEvent.payload["toolName"], "suggest_seo_metadata");
      assert.strictEqual(toolEvent.payload["requiredScope"], undefined);
    } finally {
      if (prevKey === undefined) {
        delete process.env["CMS_API_KEY"];
      } else {
        process.env["CMS_API_KEY"] = prevKey;
      }
    }
  });

  it("emits EVENTS.MCP.TOOL_EXECUTED with status 'access_denied' and requiredScope on permission failure", async () => {
    const prevKey = process.env["CMS_API_KEY"];
    process.env["CMS_API_KEY"] = "test-api-key";
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: "Forbidden: missing required permission 'pages:read'",
          }),
          {
            status: 403,
            headers: { "content-type": "application/json" },
          },
        );
      };

      const app = Fastify();
      const emittedEvents: Array<{ event: string; payload: Record<string, unknown> }> = [];
      (
        app as unknown as {
          hooks: { emit: (event: string, payload: unknown) => Promise<void> };
        }
      ).hooks = {
        emit: async (event: string, payload: unknown) => {
          emittedEvents.push({ event, payload: payload as Record<string, unknown> });
        },
      };

      await registerMcpPlugin(app, {} as CoreServices);

      const response = await app.inject({
        method: "POST",
        url: "/api/mcp",
        headers: {
          authorization: "Bearer test-api-key",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        payload: {
          jsonrpc: "2.0",
          id: 11,
          method: "tools/call",
          params: {
            name: "list_pages",
            arguments: {},
          },
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const toolEvent = emittedEvents.find((e) => e.event === EVENTS.MCP.TOOL_EXECUTED);
      assert.ok(toolEvent, "Should emit EVENTS.MCP.TOOL_EXECUTED");
      assert.strictEqual(toolEvent.payload["status"], "access_denied");
      assert.strictEqual(toolEvent.payload["requiredScope"], "pages:read");
      assert.strictEqual(toolEvent.payload["tool"], "list_pages");
      assert.ok(
        typeof toolEvent.payload["error"] === "string" &&
          (toolEvent.payload["error"] as string).includes(
            "Forbidden: missing required permission 'pages:read'",
          ),
      );
    } finally {
      globalThis.fetch = originalFetch;
      if (prevKey === undefined) {
        delete process.env["CMS_API_KEY"];
      } else {
        process.env["CMS_API_KEY"] = prevKey;
      }
    }
  });

  it("emits EVENTS.MCP.TOOL_EXECUTED with status 'error' on non-permission tool failure", async () => {
    const prevKey = process.env["CMS_API_KEY"];
    process.env["CMS_API_KEY"] = "test-api-key";
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: "Database connection failed unexpectedly",
          }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        );
      };

      const app = Fastify();
      const emittedEvents: Array<{ event: string; payload: Record<string, unknown> }> = [];
      (
        app as unknown as {
          hooks: { emit: (event: string, payload: unknown) => Promise<void> };
        }
      ).hooks = {
        emit: async (event: string, payload: unknown) => {
          emittedEvents.push({ event, payload: payload as Record<string, unknown> });
        },
      };

      await registerMcpPlugin(app, {} as CoreServices);

      const response = await app.inject({
        method: "POST",
        url: "/api/mcp",
        headers: {
          authorization: "Bearer test-api-key",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        payload: {
          jsonrpc: "2.0",
          id: 12,
          method: "tools/call",
          params: {
            name: "list_pages",
            arguments: {},
          },
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const toolEvent = emittedEvents.find((e) => e.event === EVENTS.MCP.TOOL_EXECUTED);
      assert.ok(toolEvent, "Should emit EVENTS.MCP.TOOL_EXECUTED");
      assert.strictEqual(toolEvent.payload["status"], "error");
      assert.strictEqual(toolEvent.payload["requiredScope"], undefined);
      assert.strictEqual(toolEvent.payload["tool"], "list_pages");
    } finally {
      globalThis.fetch = originalFetch;
      if (prevKey === undefined) {
        delete process.env["CMS_API_KEY"];
      } else {
        process.env["CMS_API_KEY"] = prevKey;
      }
    }
  });

  it("handles double-quoted permission errors in extractRequiredScope robustly", async () => {
    const prevKey = process.env["CMS_API_KEY"];
    process.env["CMS_API_KEY"] = "test-api-key";
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'Forbidden: missing required permission "blog:write"',
          }),
          {
            status: 403,
            headers: { "content-type": "application/json" },
          },
        );
      };

      const app = Fastify();
      const emittedEvents: Array<{ event: string; payload: Record<string, unknown> }> = [];
      (
        app as unknown as {
          hooks: { emit: (event: string, payload: unknown) => Promise<void> };
        }
      ).hooks = {
        emit: async (event: string, payload: unknown) => {
          emittedEvents.push({ event, payload: payload as Record<string, unknown> });
        },
      };

      await registerMcpPlugin(app, {} as CoreServices);

      const response = await app.inject({
        method: "POST",
        url: "/api/mcp",
        headers: {
          authorization: "Bearer test-api-key",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        payload: {
          jsonrpc: "2.0",
          id: 13,
          method: "tools/call",
          params: {
            name: "create_blog_draft",
            arguments: {
              title: "Draft Post",
              slug: "draft-post",
              body: "Draft body content",
            },
          },
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const toolEvent = emittedEvents.find((e) => e.event === EVENTS.MCP.TOOL_EXECUTED);
      assert.ok(toolEvent, "Should emit EVENTS.MCP.TOOL_EXECUTED");
      assert.strictEqual(toolEvent.payload["status"], "access_denied");
      assert.strictEqual(toolEvent.payload["requiredScope"], "blog:write");
    } finally {
      globalThis.fetch = originalFetch;
      if (prevKey === undefined) {
        delete process.env["CMS_API_KEY"];
      } else {
        process.env["CMS_API_KEY"] = prevKey;
      }
    }
  });
});
