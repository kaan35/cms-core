import type { ICollection, IDatabase } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditLogDoc } from "./auditLogRepository.js";
import { AuditLogRepository } from "./auditLogRepository.js";

function makeStubDb(): IDatabase {
  const store = new Map<string, AuditLogDoc>();
  const collection: ICollection<AuditLogDoc> = {
    findOne: async (filter) => store.get(filter["id"] as string) ?? null,
    find: async () => Array.from(store.values()),
    insertOne: async (doc) => {
      store.set(doc["id"] as string, doc as unknown as AuditLogDoc);
    },
    updateOne: async () => {},
    deleteOne: async () => {},
    countDocuments: async () => store.size,
    createIndex: async () => {},
  };

  return {
    connect: async () => {},
    disconnect: async () => {},
    isAlive: async () => true,
    collection: <T extends Record<string, unknown>>(): ICollection<T> =>
      collection as unknown as ICollection<T>,
  };
}

describe("AuditLogRepository", () => {
  it("creates and paginates audit log entries", async () => {
    const db = makeStubDb();
    const repo = new AuditLogRepository(db);

    const doc1 = await repo.create({
      event: "user.created",
      actorId: "admin-1",
      data: { email: "user@example.com" },
    });

    assert.ok(doc1.id);
    assert.equal(doc1.event, "user.created");
    assert.equal(doc1.actorId, "admin-1");

    await repo.create({
      event: "plugin.toggled",
      actorId: "admin-1",
      data: { name: "plugin-media", enabled: false },
    });

    const count = await repo.count();
    assert.equal(count, 2);

    const page1 = await repo.list(0, 1);
    assert.equal(page1.length, 1);
  });

  it("filters audit logs by query including colon prefixes and synthesized tool badges", async () => {
    const db = makeStubDb();
    const repo = new AuditLogRepository(db);

    await repo.create({
      event: "mcp.tool_executed",
      actorId: "agent-1",
      actorType: "agent",
      tokenId: "tok-abc",
      data: {
        tool: "list_pages",
        durationMs: 12,
        status: "success",
        tokenName: "Copilot Agent",
      },
    });

    await repo.create({
      event: "blog.post_created",
      actorId: "user-1",
      actorType: "user",
      data: { title: "Hello World", userEmail: "author@example.com" },
    });

    // Match exact and colon prefix for MCP
    const mcpSearch = await repo.list(0, 50, "mcp");
    assert.equal(mcpSearch.length, 1);

    const mcpColonSearch = await repo.list(0, 50, "mcp:");
    assert.equal(mcpColonSearch.length, 1);
    assert.equal(mcpColonSearch[0]?.event, "mcp.tool_executed");

    const toolBadgeSearch = await repo.list(0, 50, "mcp:list_pages");
    assert.equal(toolBadgeSearch.length, 1);

    const rawToolSearch = await repo.list(0, 50, "list_pages");
    assert.equal(rawToolSearch.length, 1);

    const actorTypeSearch = await repo.list(0, 50, "agent");
    assert.equal(actorTypeSearch.length, 1);

    const tokenNameSearch = await repo.list(0, 50, "copilot");
    assert.equal(tokenNameSearch.length, 1);

    const userEmailSearch = await repo.list(0, 50, "author@example.com");
    assert.equal(userEmailSearch.length, 1);

    const nonExistent = await repo.list(0, 50, "nonexistent");
    assert.equal(nonExistent.length, 0);

    const countMcpColon = await repo.count("mcp:");
    assert.equal(countMcpColon, 1);
  });

  it("filters audit logs via AuditLogSearchContext for resolved actor IDs and token IDs", async () => {
    const db = makeStubDb();
    const repo = new AuditLogRepository(db);

    await repo.create({
      event: "mcp.tool_executed",
      actorId: "user-uuid-1",
      actorType: "agent",
      tokenId: "api-token:tok-uuid-test1",
      data: { tool: "get_form_submissions" },
    });

    await repo.create({
      event: "user.updated",
      actorId: "user-uuid-admin",
      actorType: "user",
    });

    // Simulating context where "test 1" matches tok-uuid-test1
    const test1Context = {
      matchedTokenIds: new Set(["tok-uuid-test1", "api-token:tok-uuid-test1"]),
    };
    const test1Results = await repo.list(0, 50, "test 1", test1Context);
    assert.equal(test1Results.length, 1);
    assert.equal(test1Results[0]?.tokenId, "api-token:tok-uuid-test1");

    const test1Count = await repo.count("test 1", test1Context);
    assert.equal(test1Count, 1);

    // Simulating context where "admin@test.com" matches user-uuid-admin
    const adminContext = {
      matchedActorIds: new Set(["user-uuid-admin"]),
    };
    const adminResults = await repo.list(0, 50, "admin@test.com", adminContext);
    assert.equal(adminResults.length, 1);
    assert.equal(adminResults[0]?.actorId, "user-uuid-admin");
  });

  it("filters audit logs by timestamp and formatted date in client timezone", async () => {
    const db = makeStubDb();
    const repo = new AuditLogRepository(db);

    const doc = await repo.create({
      event: "blog.updated",
      actorId: "admin-1",
      actorType: "user",
    });

    // Manually set createdAt to a known UTC timestamp: 2026-10-18T21:44:00.000Z
    // In Europe/Istanbul (UTC+3), this is Oct 19, 2026, 12:44 AM (or 00:44 in 24h)
    doc.createdAt = new Date("2026-10-18T21:44:00.000Z");

    const tzContext = {
      timeZone: "Europe/Istanbul",
    };

    // 1. Search by local 12-hour time: "12:44"
    const resultsTime = await repo.list(0, 50, "12:44", tzContext);
    assert.equal(resultsTime.length, 1);
    assert.equal(resultsTime[0]?.event, "blog.updated");

    // 2. Search by month and day: "Oct 19"
    const resultsDate = await repo.list(0, 50, "Oct 19", tzContext);
    assert.equal(resultsDate.length, 1);

    // 3. Search by 24h format: "00:44"
    const results24h = await repo.list(0, 50, "00:44", tzContext);
    assert.equal(results24h.length, 1);

    // 4. Search count
    const countTime = await repo.count("12:44", tzContext);
    assert.equal(countTime, 1);
  });
});
