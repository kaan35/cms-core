import type { ICollection, IDatabase } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuditLogDoc } from "./auditLogRepository.js";
import { AuditLogRepository } from "./auditLogRepository.js";

function matchesStubFilter(doc: AuditLogDoc, filter?: Record<string, unknown>): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;

  if ("$and" in filter && Array.isArray(filter["$and"])) {
    return (filter["$and"] as Record<string, unknown>[]).every((c) => matchesStubFilter(doc, c));
  }
  if ("$or" in filter && Array.isArray(filter["$or"])) {
    return (filter["$or"] as Record<string, unknown>[]).some((c) => matchesStubFilter(doc, c));
  }

  for (const [k, v] of Object.entries(filter)) {
    if (k === "$or" || k === "$and") continue;

    let docVal: unknown;
    if (k.includes(".")) {
      const parts = k.split(".");
      docVal = parts.reduce((acc: unknown, part) => {
        if (acc && typeof acc === "object") {
          return (acc as Record<string, unknown>)[part];
        }
        return undefined;
      }, doc);
    } else {
      docVal = doc[k];
    }

    if (v && typeof v === "object" && "$in" in v && Array.isArray((v as { $in: unknown[] }).$in)) {
      if (!(v as { $in: unknown[] }).$in.includes(docVal)) return false;
    } else if (docVal !== v) {
      return false;
    }
  }

  return true;
}

function makeStubDb(): IDatabase {
  const store = new Map<string, AuditLogDoc>();
  const collection: ICollection<AuditLogDoc> = {
    findOne: async (filter) => {
      for (const doc of store.values()) {
        if (matchesStubFilter(doc, filter)) return doc;
      }
      return null;
    },
    find: async (filter = {}, options = {}) => {
      let docs = Array.from(store.values()).filter((d) => matchesStubFilter(d, filter));
      if (options.sort) {
        docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      if (options.skip) docs = docs.slice(options.skip);
      if (options.limit !== undefined) docs = docs.slice(0, options.limit);
      return docs;
    },
    insertOne: async (doc) => {
      store.set(doc["id"] as string, doc as unknown as AuditLogDoc);
    },
    insertMany: async () => {},
    updateOne: async () => {},
    updateMany: async () => ({ modifiedCount: 0 }),
    deleteOne: async () => {},
    deleteMany: async () => ({ deletedCount: 0 }),
    countDocuments: async (filter = {}) => {
      return Array.from(store.values()).filter((d) => matchesStubFilter(d, filter)).length;
    },
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

  it("filters audit logs using DB-level structured filter options", async () => {
    const db = makeStubDb();
    const repo = new AuditLogRepository(db);

    const docUser = await repo.create({
      event: "blog.post_created",
      actorId: "user-1",
      actorType: "user",
      status: "success",
      data: { title: "Hello World" },
    });

    const docAgent1 = await repo.create({
      event: "mcp.tool_executed",
      actorId: "agent-1",
      actorType: "agent",
      tokenId: "api-token:tok-agent-1",
      status: "success",
      data: { toolName: "list_pages" },
    });

    const docAgent2 = await repo.create({
      event: "mcp.tool_executed",
      actorId: "agent-2",
      actorType: "agent",
      tokenId: "tok-agent-2",
      status: "access_denied",
      data: { tool: "delete_page" },
    });

    const docSystem = await repo.create({
      event: "system.backup_failed",
      actorId: "system-cron",
      actorType: "system",
      status: "error",
      data: { reason: "disk full" },
    });

    // 1. Filter by actorId
    const byActor = await repo.list(0, 50, undefined, undefined, { actorId: "user-1" });
    assert.equal(byActor.length, 1);
    assert.equal(byActor[0]?.id, docUser.id);

    // 2. Filter by actorType
    const byActorType = await repo.list(0, 50, undefined, undefined, { actorType: "agent" });
    assert.equal(byActorType.length, 2);

    // 3. Filter by tokenId (prefixed and clean)
    const byTokenClean = await repo.list(0, 50, undefined, undefined, { tokenId: "tok-agent-1" });
    assert.equal(byTokenClean.length, 1);
    assert.equal(byTokenClean[0]?.id, docAgent1.id);

    const byTokenPrefixed = await repo.list(0, 50, undefined, undefined, {
      tokenId: "api-token:tok-agent-2",
    });
    assert.equal(byTokenPrefixed.length, 1);
    assert.equal(byTokenPrefixed[0]?.id, docAgent2.id);

    // 4. Filter by status
    const byStatusDenied = await repo.list(0, 50, undefined, undefined, {
      status: "access_denied",
    });
    assert.equal(byStatusDenied.length, 1);
    assert.equal(byStatusDenied[0]?.id, docAgent2.id);

    const byStatusError = await repo.list(0, 50, undefined, undefined, { status: "error" });
    assert.equal(byStatusError.length, 1);
    assert.equal(byStatusError[0]?.id, docSystem.id);

    // 5. Filter by toolName (matches both data.toolName and data.tool)
    const byTool1 = await repo.list(0, 50, undefined, undefined, { toolName: "list_pages" });
    assert.equal(byTool1.length, 1);
    assert.equal(byTool1[0]?.id, docAgent1.id);

    const byTool2 = await repo.list(0, 50, undefined, undefined, { toolName: "delete_page" });
    assert.equal(byTool2.length, 1);
    assert.equal(byTool2[0]?.id, docAgent2.id);

    // 6. Filter by event
    const byEvent = await repo.list(0, 50, undefined, undefined, { event: "system.backup_failed" });
    assert.equal(byEvent.length, 1);
    assert.equal(byEvent[0]?.id, docSystem.id);

    // 7. Count with filter
    const countAgents = await repo.count(undefined, undefined, { actorType: "agent" });
    assert.equal(countAgents, 2);

    const countErrors = await repo.count(undefined, undefined, { status: "error" });
    assert.equal(countErrors, 1);

    // 8. Search combined with filter
    const searchWithFilter = await repo.list(0, 50, "list_pages", undefined, {
      actorType: "agent",
    });
    assert.equal(searchWithFilter.length, 1);
    assert.equal(searchWithFilter[0]?.id, docAgent1.id);

    const searchCountWithFilter = await repo.count("list_pages", undefined, { actorType: "agent" });
    assert.equal(searchCountWithFilter, 1);

    // 9. Compound filter: actorId + status (ensures fail-closed $and structure)
    const compoundResults = await repo.list(0, 50, undefined, undefined, {
      actorId: "agent-2",
      status: "access_denied",
    });
    assert.equal(compoundResults.length, 1);
    assert.equal(compoundResults[0]?.id, docAgent2.id);

    const nonMatchingCompound = await repo.list(0, 50, undefined, undefined, {
      actorId: "user-1",
      status: "access_denied",
    });
    assert.equal(nonMatchingCompound.length, 0);
  });
});
