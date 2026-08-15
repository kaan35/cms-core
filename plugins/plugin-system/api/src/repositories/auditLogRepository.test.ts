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
});
