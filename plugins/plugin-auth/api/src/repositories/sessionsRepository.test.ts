import type { ICollection, IDatabase } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionDoc } from "./sessionsRepository.js";
import { SessionsRepository } from "./sessionsRepository.js";

function makeStubDb(): IDatabase {
  const store = new Map<string, SessionDoc>();
  const collection: ICollection<SessionDoc> = {
    findOne: async (filter) => {
      for (const doc of store.values()) {
        if (filter["id"] && doc.id === filter["id"]) return doc;
      }
      return null;
    },
    find: async (filter) => {
      let all = Array.from(store.values());
      if (filter && filter["userId"]) all = all.filter((s) => s.userId === filter["userId"]);
      if (filter && filter["status"]) all = all.filter((s) => s.status === filter["status"]);
      return all;
    },
    insertOne: async (doc) => {
      store.set(doc["id"] as string, doc as unknown as SessionDoc);
    },
    insertMany: async () => {},
    updateOne: async (filter, update) => {
      const doc = store.get(filter["id"] as string);
      if (doc && update["$set"]) Object.assign(doc, update["$set"]);
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

describe("SessionsRepository", () => {
  it("manages session lifecycle with soft-revocation: create, find, slide, revoke, and history", async () => {
    const db = makeStubDb();
    const repo = new SessionsRepository(db);

    const s1 = await repo.create({ userId: "u1", expiresAt: new Date(Date.now() + 10000) });
    const s2 = await repo.create({ userId: "u1", expiresAt: new Date(Date.now() + 10000) });
    const s3 = await repo.create({ userId: "u2", expiresAt: new Date(Date.now() + 10000) });

    assert.equal(s1.status, "active");
    assert.equal(s1.refreshCount, 0);
    assert.ok(s1.lastActiveAt);

    assert.equal(await repo.findById(s1.id), s1);
    assert.equal((await repo.findByUserId("u1")).length, 2);

    // Slide session
    const slidDate = new Date(Date.now() + 50000);
    await repo.updateSlide(s1.id, slidDate);
    const updatedS1 = await repo.findById(s1.id);
    assert.equal(updatedS1?.expiresAt.getTime(), slidDate.getTime());
    assert.equal(updatedS1?.refreshCount, 1);

    // Soft-revoke single session
    await repo.revoke(s1.id, "admin-1", "admin_revoked");
    const revokedS1 = await repo.findById(s1.id);
    assert.equal(revokedS1?.status, "revoked");
    assert.equal(revokedS1?.revokeReason, "admin_revoked");
    assert.equal(revokedS1?.revokedBy, "admin-1");
    assert.ok(revokedS1?.revokedAt);

    // findByUserId returns only active by default
    assert.equal((await repo.findByUserId("u1")).length, 1);
    // includeRevoked returns all
    assert.equal((await repo.findByUserId("u1", { includeRevoked: true })).length, 2);

    // Mark expired
    await repo.markExpired(s2.id);
    const expiredS2 = await repo.findById(s2.id);
    assert.equal(expiredS2?.status, "expired");
    assert.equal(expiredS2?.revokeReason, "expired");

    // Revoke all
    await repo.revokeAll("admin-panic", "panic_revoke_all");
    const revokedS3 = await repo.findById(s3.id);
    assert.equal(revokedS3?.status, "revoked");
    assert.equal(revokedS3?.revokeReason, "panic_revoke_all");
  });
});
