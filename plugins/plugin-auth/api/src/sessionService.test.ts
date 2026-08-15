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
      const all = Array.from(store.values());
      if (filter && filter["userId"]) {
        return all.filter((s) => s.userId === filter["userId"]);
      }
      return all;
    },
    insertOne: async (doc) => {
      store.set(doc["id"] as string, doc as unknown as SessionDoc);
    },
    updateOne: async (filter, update) => {
      const doc = store.get(filter["id"] as string);
      if (doc && update["$set"]) {
        Object.assign(doc, update["$set"]);
      }
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

  it("throws UnauthorizedError after session is revoked", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);
    const service = new SessionService(repo, secret, stubLogger);

    const res = await service.createSession("user-1", ["users:read"]);
    await service.revokeSession(res.sessionId);

    await assert.rejects(
      () => service.validateAndSlideSession(res.token),
      (err: Error) => err instanceof UnauthorizedError,
    );
  });

  it("panic button: revokeAllSessions invalidates all sessions system-wide", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);
    const service = new SessionService(repo, secret, stubLogger);

    const s1 = await service.createSession("user-1", ["users:read"]);
    const s2 = await service.createSession("user-2", ["users:read"]);

    await service.revokeAllSessions();

    await assert.rejects(
      () => service.validateAndSlideSession(s1.token),
      (err: Error) => err instanceof UnauthorizedError,
    );
    await assert.rejects(
      () => service.validateAndSlideSession(s2.token),
      (err: Error) => err instanceof UnauthorizedError,
    );
  });
});
