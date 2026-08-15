import type { ICollection, IDatabase } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MediaRepository } from "./mediaRepository.js";

function makeInMemoryDb(): IDatabase {
  const store = new Map<string, Array<Record<string, unknown>>>();

  return {
    collection<T extends Record<string, unknown>>(name: string): ICollection<T> {
      if (!store.has(name)) {
        store.set(name, []);
      }
      const docs = store.get(name)! as T[];

      return {
        async insertOne(doc: T): Promise<void> {
          docs.push(structuredClone(doc));
        },
        async findOne(filter: Partial<T>): Promise<T | null> {
          const match = docs.find((d) =>
            Object.entries(filter).every(([k, v]) => (d as Record<string, unknown>)[k] === v),
          );
          return match ? structuredClone(match) : null;
        },
        async find(
          _filter: Partial<T>,
          options?: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> },
        ): Promise<T[]> {
          let res = [...docs];
          if (options?.sort?.["createdAt"] === -1) {
            res.reverse();
          }
          if (options?.skip) {
            res = res.slice(options.skip);
          }
          if (options?.limit) {
            res = res.slice(0, options.limit);
          }
          return res.map((d) => structuredClone(d));
        },
        async updateOne(filter: Partial<T>, update: Partial<T>): Promise<void> {
          const idx = docs.findIndex((d) =>
            Object.entries(filter).every(([k, v]) => (d as Record<string, unknown>)[k] === v),
          );
          if (idx === -1) return;
          docs[idx] = { ...docs[idx]!, ...update };
        },
        async deleteOne(filter: Partial<T>): Promise<void> {
          const idx = docs.findIndex((d) =>
            Object.entries(filter).every(([k, v]) => (d as Record<string, unknown>)[k] === v),
          );
          if (idx === -1) return;
          docs.splice(idx, 1);
        },
        async countDocuments(): Promise<number> {
          return docs.length;
        },
        async createIndex(): Promise<void> {},
      };
    },
    async isAlive(): Promise<boolean> {
      return true;
    },
    async connect(): Promise<void> {},
    async disconnect(): Promise<void> {},
  };
}

describe("MediaRepository", () => {
  it("creates, finds, lists, and deletes media records", async () => {
    const db = makeInMemoryDb();
    const repo = new MediaRepository(db);

    const doc1 = await repo.create({
      filename: "logo.png",
      key: "uuid-1-logo.png",
      url: "http://localhost:9000/cms-media/uuid-1-logo.png",
      mimeType: "image/png",
      size: 1024,
      uploaderId: "user-1",
    });

    assert.ok(doc1.id);
    assert.equal(doc1.filename, "logo.png");

    const foundById = await repo.findById(doc1.id);
    assert.ok(foundById);
    assert.equal(foundById.key, "uuid-1-logo.png");

    const foundByKey = await repo.findByKey("uuid-1-logo.png");
    assert.ok(foundByKey);
    assert.equal(foundByKey.id, doc1.id);

    const doc2 = await repo.create({
      filename: "hero.jpg",
      key: "uuid-2-hero.jpg",
      url: "http://localhost:9000/cms-media/uuid-2-hero.jpg",
      mimeType: "image/jpeg",
      size: 2048,
      uploaderId: "user-1",
    });

    const paginated = await repo.list({ page: 1, limit: 10 });
    assert.equal(paginated.meta.total, 2);
    assert.equal(paginated.data.length, 2);
    assert.equal(paginated.data[0]?.id, doc2.id); // sorted desc

    await repo.deleteById(doc1.id);

    const afterDelete = await repo.findById(doc1.id);
    assert.equal(afterDelete, null);
  });
});
