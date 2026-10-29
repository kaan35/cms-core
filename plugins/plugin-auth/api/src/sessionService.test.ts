import type { ICollection, IDatabase, ILogger } from "@cms/core";
import { UnauthorizedError } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionDoc } from "./repositories/sessionsRepository.js";
import { SessionsRepository } from "./repositories/sessionsRepository.js";
import { SessionService } from "./sessionService.js";

const stubLogger: ILogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

function makeStubDb(): IDatabase {
  const store = new Map<string, SessionDoc>();
  const collection: ICollection<SessionDoc> = {
    findOne: async (filter) => {
      if (filter["id"]) return store.get(filter["id"] as string) ?? null;
      return null;
    },
    find: async (filter) => {
      let all = Array.from(store.values());
      if (filter && filter["userId"]) {
        all = all.filter((s) => s.userId === filter["userId"]);
      }
      if (filter && filter["status"]) {
        all = all.filter((s) => s.status === filter["status"]);
      }
      return all;
    },
    insertOne: async (doc) => {
      store.set(doc["id"] as string, doc as unknown as SessionDoc);
    },
    insertMany: async () => {},
    updateOne: async (filter, update) => {
      const doc = store.get(filter["id"] as string);
      if (doc && update["$set"]) {
        Object.assign(doc, update["$set"]);
      }
    },
    updateMany: async (filter, update) => {
      let modifiedCount = 0;
      for (const doc of store.values()) {
        let match = true;
        if (filter["userId"] && doc.userId !== filter["userId"]) match = false;
        if (filter["status"] && doc.status !== filter["status"]) match = false;
        if (match) {
          if (update["$set"]) Object.assign(doc, update["$set"]);
          modifiedCount++;
        }
      }
      return { modifiedCount };
    },
    deleteOne: async (filter) => {
      if (filter["id"]) {
        store.delete(filter["id"] as string);
      } else if (filter["userId"]) {
        for (const [k, v] of store.entries()) {
          if (v.userId === filter["userId"]) store.delete(k);
        }
      } else {
        store.clear();
      }
    },
    deleteMany: async () => ({ deletedCount: 0 }),
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

describe("SessionService", () => {
  const secret = "test-super-secret-key-32-chars-long";

  it("creates session, returns valid token and independent csrfToken", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);
    const service = new SessionService(repo, secret, stubLogger);

    const res = await service.createSession("user-1", ["users:read"]);
    assert.ok(res.token);
    assert.ok(res.csrfToken);
    assert.equal(res.csrfToken.length, 64); // 32 bytes hex

    const validated = await service.validateAndSlideSession(res.token);
    assert.equal(validated.id, "user-1");
    assert.deepEqual(validated.permissions, ["users:read"]);
  });

  it("throws UnauthorizedError on forged or invalid token", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);
    const service = new SessionService(repo, secret, stubLogger);

    await assert.rejects(
      () => service.validateAndSlideSession("forged.invalid.token"),
      (err: Error) => err instanceof UnauthorizedError,
    );
  });

  it("throws UnauthorizedError after session is revoked and preserves history", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);
    const service = new SessionService(repo, secret, stubLogger);

    const res = await service.createSession("user-1", ["users:read"]);
    await service.revokeSession(res.sessionId, "admin-user", "admin_revoked");

    await assert.rejects(
      () => service.validateAndSlideSession(res.token),
      (err: Error) => err instanceof UnauthorizedError,
    );

    // Verify soft-revoked record is retained in history
    const history = await service.listUserSessions("user-1", undefined, true);
    assert.equal(history.length, 1);
    assert.equal(history[0]?.status, "revoked");
    assert.equal(history[0]?.revokeReason, "admin_revoked");
    assert.equal(history[0]?.revokedBy, "admin-user");

    // Active-only list is empty
    const activeOnly = await service.listUserSessions("user-1", undefined, false);
    assert.equal(activeOnly.length, 0);
  });

  it("panic button: revokeAllSessions invalidates all sessions system-wide", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);
    const service = new SessionService(repo, secret, stubLogger);

    const s1 = await service.createSession("user-1", ["users:read"]);
    const s2 = await service.createSession("user-2", ["users:read"]);

    await service.revokeAllSessions("admin-panic");

    await assert.rejects(
      () => service.validateAndSlideSession(s1.token),
      (err: Error) => err instanceof UnauthorizedError,
    );
    await assert.rejects(
      () => service.validateAndSlideSession(s2.token),
      (err: Error) => err instanceof UnauthorizedError,
    );

    const h1 = await service.listUserSessions("user-1", undefined, true);
    assert.equal(h1[0]?.status, "revoked");
    assert.equal(h1[0]?.revokeReason, "panic_revoke_all");
  });

  it("sliding expiry: extends session expiresAt when remaining lifetime < slideThreshold", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);
    // 24 hours TTL, 15 minutes slide threshold
    const service = new SessionService(repo, secret, stubLogger, 24, 15);

    const res = await service.createSession("user-1", ["users:read"]);
    const initialSession = await repo.findById(res.sessionId);
    assert.ok(initialSession);
    assert.equal(initialSession.refreshCount, 0);

    // Artificially age the session so remaining time is only 5 minutes (< 15 min threshold)
    const nearExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await repo.updateExpiresAt(res.sessionId, nearExpiry);

    // Validate and slide
    await service.validateAndSlideSession(res.token);

    const slidSession = await repo.findById(res.sessionId);
    assert.ok(slidSession);
    // Verified that expiresAt has been pushed forward ~24 hours into the future
    assert.ok(slidSession.expiresAt.getTime() > nearExpiry.getTime() + 20 * 3600 * 1000);
    assert.equal(slidSession.refreshCount, 1);
  });

  it("getSession retrieves session document by id", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);
    const service = new SessionService(repo, secret, stubLogger);

    const res = await service.createSession("user-1", ["users:read"]);
    const session = await service.getSession(res.sessionId);
    assert.ok(session);
    assert.equal(session.id, res.sessionId);
    assert.equal(session.userId, "user-1");

    const nonExistent = await service.getSession("unknown-session-id");
    assert.equal(nonExistent, null);
  });
});
