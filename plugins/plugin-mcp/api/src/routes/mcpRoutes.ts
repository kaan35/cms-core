import { EVENTS } from "@cms/core";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { timingSafeEqual } from "node:crypto";
import process from "node:process";
import {
  createCmsMcpServer,
  parseRequiredScope,
  type ToolOutcome,
} from "../server/createMcpServer.js";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Fastify route handler for Model Context Protocol (MCP) Streamable HTTP transport.
 * Allows AI agents (Antigravity, Cursor, Claude Desktop) to connect securely
 * using Bearer token authentication over HTTP / SSE without local configuration files.
 */
async function handleMcp(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization?.trim();
  if (!authHeader || !/^Bearer\s+\S+/i.test(authHeader)) {
    return reply.status(401).send({
      error: "Valid API token required via Authorization: Bearer header",
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return reply.status(401).send({
      error: "Valid API token required via Authorization: Bearer header",
    });
  }

  // Validate token against auth middleware when available
  const authFn = (
    app as unknown as { authenticate?: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }
  ).authenticate;
  if (typeof authFn === "function") {
    try {
      await authFn(request, reply);
    } catch {
      const configuredApiKey = process.env["CMS_API_KEY"];
      if (!configuredApiKey || !safeCompare(token, configuredApiKey)) {
        return reply.status(401).send({
          error: "Valid API token required via Authorization: Bearer header",
        });
      }
    }
  } else {
    const configuredApiKey = process.env["CMS_API_KEY"];
    if (!configuredApiKey || !safeCompare(token, configuredApiKey)) {
      return reply.status(401).send({
        error: "Valid API token required via Authorization: Bearer header",
      });
    }
  }

  // Determine base API URL for downstream CMS client calls
  const host = request.headers.host || "127.0.0.1:3001";
  const protocol = request.protocol || "http";
  const apiUrl = process.env["CMS_API_URL"] || `${protocol}://${host}`;

  // Ensure Accept header satisfies MCP Streamable HTTP spec (application/json + text/event-stream)
  const incomingAccept = request.headers.accept;
  if (
    !incomingAccept ||
    incomingAccept === "*/*" ||
    !incomingAccept.includes("text/event-stream")
  ) {
    request.raw.headers["accept"] = "application/json, text/event-stream";
  }

  let toolOutcome: ToolOutcome | null = null;

  // Create isolated MCP server instance for this session/request
  const server = createCmsMcpServer({
    apiKey: token,
    apiUrl,
    onOutcome: (outcome) => {
      toolOutcome = outcome;
    },
  });

  // Per-request / stateless streamable HTTP transport
  const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  await server.connect(transport);

  // Hijack raw Node.js response to prevent Fastify from double-writing headers or ending prematurely
  reply.hijack();

  reply.raw.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  const startTime = performance.now();
  const isToolCall =
    typeof request.body === "object" &&
    request.body !== null &&
    !Array.isArray(request.body) &&
    (request.body as { method?: string }).method === "tools/call";

  const reqUser = (
    request as unknown as {
      user?: {
        id?: string;
        sessionId?: string;
        tokenName?: string;
        tokenPrefix?: string;
      };
    }
  ).user;

  try {
    // Transport handles GET (SSE stream) or POST (JSON-RPC)
    await transport.handleRequest(request.raw, reply.raw, request.body);

    if (isToolCall) {
      const hooks = (
        app as unknown as { hooks?: { emit: (e: string, p: unknown) => Promise<void> } }
      ).hooks;
      if (hooks) {
        const bodyObj = (
          typeof request.body === "object" && request.body !== null && !Array.isArray(request.body)
            ? request.body
            : {}
        ) as {
          params?: { name?: string; arguments?: Record<string, unknown> };
        };
        const outcome = toolOutcome as ToolOutcome | null;
        const toolName = bodyObj.params?.name || outcome?.toolName || "unknown";
        const toolArgs = bodyObj.params?.arguments || {};
        const durationMs = Math.round(performance.now() - startTime);

        const auditTokenId = reqUser?.sessionId ?? reqUser?.tokenPrefix ?? "agent:bearer";
        const status = outcome?.status ?? "success";
        const requiredScope = outcome?.requiredScope;
        const error = outcome?.error;

        void hooks
          .emit(EVENTS.MCP.TOOL_EXECUTED, {
            actorId: reqUser?.id,
            actorType: "agent",
            tokenId: auditTokenId,
            tokenName: reqUser?.tokenName,
            tokenPrefix: reqUser?.tokenPrefix,
            toolName,
            tool: toolName,
            params: toolArgs,
            arguments: toolArgs,
            durationMs,
            status,
            ...(requiredScope ? { requiredScope } : {}),
            ...(error ? { error } : {}),
          })
          .catch((err) => {
            request.log.warn({ err }, "Failed to emit MCP tool executed audit event");
          });
      }
    }
  } catch (err: unknown) {
    if (isToolCall) {
      const hooks = (
        app as unknown as { hooks?: { emit: (e: string, p: unknown) => Promise<void> } }
      ).hooks;
      if (hooks) {
        const bodyObj = (
          typeof request.body === "object" && request.body !== null && !Array.isArray(request.body)
            ? request.body
            : {}
        ) as {
          params?: { name?: string; arguments?: Record<string, unknown> };
        };
        const outcome = toolOutcome as ToolOutcome | null;
        const toolName = bodyObj.params?.name || outcome?.toolName || "unknown";
        const toolArgs = bodyObj.params?.arguments || {};
        const durationMs = Math.round(performance.now() - startTime);
        const auditTokenId = reqUser?.sessionId ?? reqUser?.tokenPrefix ?? "agent:bearer";

        const errMsg = err instanceof Error ? err.message : String(err);
        const isAccessDenied =
          errMsg.includes("401") ||
          errMsg.includes("403") ||
          errMsg.includes("Forbidden") ||
          errMsg.includes("Unauthorized") ||
          errMsg.includes("missing required permission");
        const parsedScope = parseRequiredScope(errMsg);

        const status = outcome?.status ?? (isAccessDenied ? "access_denied" : "error");
        const requiredScope =
          outcome?.requiredScope ??
          (parsedScope || (isAccessDenied ? "insufficient_scope" : undefined));
        const error = outcome?.error ?? errMsg;

        void hooks
          .emit(EVENTS.MCP.TOOL_EXECUTED, {
            actorId: reqUser?.id,
            actorType: "agent",
            tokenId: auditTokenId,
            tokenName: reqUser?.tokenName,
            tokenPrefix: reqUser?.tokenPrefix,
            toolName,
            tool: toolName,
            params: toolArgs,
            arguments: toolArgs,
            durationMs,
            status,
            ...(requiredScope ? { requiredScope } : {}),
            ...(error ? { error } : {}),
          })
          .catch(() => {});
      }
    }
    request.log.error(err, "MCP Streamable HTTP transport execution error");
    if (!reply.raw.headersSent) {
      reply.raw.writeHead(500, { "Content-Type": "application/json" });
      reply.raw.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: err instanceof Error ? err.message : "Internal server error",
          },
          id: null,
        }),
      );
    }
  }
}

/**
 * Fastify plugin registering MCP Streamable HTTP endpoints.
 */
export async function mcpRoutes(app: FastifyInstance): Promise<void> {
  const handler = (req: FastifyRequest, rep: FastifyReply) => handleMcp(app, req, rep);

  // Direct root MCP endpoints
  app.get("/api/mcp", handler);
  app.post("/api/mcp", handler);
  app.delete("/api/mcp", handler);

  // Subpath / wildcard endpoints (e.g. /api/mcp/messages, /api/mcp/sse)
  app.get("/api/mcp/*", handler);
  app.post("/api/mcp/*", handler);
  app.delete("/api/mcp/*", handler);
}

export default mcpRoutes;
