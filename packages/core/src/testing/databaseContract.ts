import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IDatabase } from "../index.js";

export interface DatabaseContractHarness {
  readonly name: string;
  setup(): Promise<IDatabase>;
  teardown(db: IDatabase): Promise<void>;
  createUniqueCollection(db: IDatabase, collectionName: string, field: string): Promise<void>;
}

export function runDatabaseContract(harness: DatabaseContractHarness): void {
  describe(`IDatabase Contract Suite: ${harness.name}`, () => {
    it("1. sorts numeric fields numerically (not alphabetically where 9 > 10)", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; version: number }>("contract_numeric_sort");
        await col.insertMany([
          { id: "a", version: 2 },
          { id: "b", version: 9 },
          { id: "c", version: 10 },
          { id: "d", version: 1 },
        ]);

        const asc = await col.find({}, { sort: { version: 1 } });
        assert.deepEqual(
          asc.map((d) => d.version),
          [1, 2, 9, 10],
          "Ascending sort must order 1, 2, 9, 10 numerically",
        );

        const desc = await col.find({}, { sort: { version: -1 } });
        assert.deepEqual(
          desc.map((d) => d.version),
          [10, 9, 2, 1],
          "Descending sort must order 10, 9, 2, 1 numerically",
        );
      } finally {
        await harness.teardown(db);
      }
    });

    it("2. sorts Date fields chronologically", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; createdAt: Date }>("contract_date_sort");
        const d1 = new Date("2026-01-01T10:00:00Z");
        const d2 = new Date("2026-01-02T10:00:00Z");
        const d3 = new Date("2026-01-03T10:00:00Z");

        await col.insertMany([
          { id: "2", createdAt: d2 },
          { id: "1", createdAt: d1 },
          { id: "3", createdAt: d3 },
        ]);

        const asc = await col.find({}, { sort: { createdAt: 1 } });
        assert.deepEqual(
          asc.map((d) => d.id),
          ["1", "2", "3"],
        );
      } finally {
        await harness.teardown(db);
      }
    });

    it("3. rejects duplicates on unique index with DuplicateKeyError", async () => {
      const db = await harness.setup();
      const colName = "contract_unique_slug";
      try {
        await harness.createUniqueCollection(db, colName, "slug");
        const col = db.collection<{ id: string; slug: string }>(colName);

        await col.insertOne({ id: "1", slug: "about-us" });

        // Second insert with duplicate slug must reject with DuplicateKeyError (409)
        await assert.rejects(
          async () => {
            await col.insertOne({ id: "2", slug: "about-us" });
          },
          (err: unknown) => {
            const e = err as { name?: string; code?: string; statusCode?: number };
            return Boolean(
              e &&
              (e.name === "DuplicateKeyError" ||
                e.code === "DUPLICATE_KEY" ||
                e.statusCode === 409),
            );
          },
          "Unique index violation must reject with DuplicateKeyError (409)",
        );
      } finally {
        await harness.teardown(db);
      }
    });

    it("4. countDocuments honours the filter strictly", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; status: string }>("contract_count");
        await col.insertMany([
          { id: "1", status: "published" },
          { id: "2", status: "published" },
          { id: "3", status: "draft" },
        ]);

        const total = await col.countDocuments({});
        assert.equal(total, 3);

        const published = await col.countDocuments({ status: "published" });
        assert.equal(published, 2, "Filter must restrict countDocuments");

        const drafts = await col.countDocuments({ status: "draft" });
        assert.equal(drafts, 1);

        const archived = await col.countDocuments({ status: "archived" });
        assert.equal(archived, 0);
      } finally {
        await harness.teardown(db);
      }
    });

    it("5. matches a scalar query against an array field (MongoDB convention)", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; scopes: string[] }>("contract_scalar_array");
        await col.insertMany([
          { id: "admin", scopes: ["*"] },
          { id: "editor", scopes: ["blog:read", "blog:write"] },
          { id: "reader", scopes: ["blog:read"] },
        ]);

        const allAccess = await col.find({ scopes: "*" });
        assert.equal(allAccess.length, 1);
        assert.equal(allAccess[0]?.id, "admin");

        const readers = await col.find({ scopes: "blog:read" });
        assert.equal(readers.length, 2);
      } finally {
        await harness.teardown(db);
      }
    });

    it("6. matches array query with $in against array field", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; tags: string[] }>("contract_array_in");
        await col.insertMany([
          { id: "tech", tags: ["tech", "ai"] },
          { id: "news", tags: ["news", "daily"] },
          { id: "sports", tags: ["sports"] },
        ]);

        const res = await col.find({ tags: { $in: ["ai", "sports"] } });
        assert.equal(res.length, 2);
        const ids = res.map((d) => d.id).sort();
        assert.deepEqual(ids, ["sports", "tech"]);
      } finally {
        await harness.teardown(db);
      }
    });

    it("7. supports query operators: $exists, $ne, comparisons, and $regex", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; age?: number; name: string }>("contract_ops");
        await col.insertMany([
          { id: "1", name: "Alice", age: 25 },
          { id: "2", name: "Bob", age: 35 },
          { id: "3", name: "Charlie" },
        ]);

        // $exists
        const withAge = await col.find({ age: { $exists: true } });
        assert.equal(withAge.length, 2);
        const withoutAge = await col.find({ age: { $exists: false } });
        assert.equal(withoutAge.length, 1);
        assert.equal(withoutAge[0]?.id, "3");

        // $ne
        const notAlice = await col.find({ name: { $ne: "Alice" } });
        assert.equal(notAlice.length, 2);

        // $gte / $lt
        const midAge = await col.find({ age: { $gte: 25, $lt: 35 } });
        assert.equal(midAge.length, 1);
        assert.equal(midAge[0]?.name, "Alice");

        // $regex
        const regMatches = await col.find({ name: { $regex: "^bo", $options: "i" } });
        assert.equal(regMatches.length, 1);
        assert.equal(regMatches[0]?.id, "2");
      } finally {
        await harness.teardown(db);
      }
    });

    it("8. applies skip and limit strictly after sorting", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; rank: number }>("contract_pagination");
        await col.insertMany([
          { id: "c", rank: 30 },
          { id: "a", rank: 10 },
          { id: "e", rank: 50 },
          { id: "b", rank: 20 },
          { id: "d", rank: 40 },
        ]);

        const page = await col.find({}, { sort: { rank: 1 }, skip: 1, limit: 2 });
        assert.deepEqual(
          page.map((d) => d.id),
          ["b", "c"],
          "Page with skip: 1, limit: 2 after rank asc sort must be b, c",
        );
      } finally {
        await harness.teardown(db);
      }
    });

    it("9. updateOne with upsert inserts filter + $set fields", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; status: string }>("contract_upsert");
        await col.updateOne({ id: "new-doc" }, { $set: { status: "active" } }, { upsert: true });

        const found = await col.findOne({ id: "new-doc" });
        assert.ok(found);
        assert.equal(found.id, "new-doc");
        assert.equal(found.status, "active");
      } finally {
        await harness.teardown(db);
      }
    });

    it("10. updateMany and deleteMany accurately report affected counts", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; role: string }>("contract_counts");
        await col.insertMany([
          { id: "1", role: "guest" },
          { id: "2", role: "guest" },
          { id: "3", role: "admin" },
        ]);

        const updateRes = await col.updateMany({ role: "guest" }, { $set: { role: "member" } });
        assert.equal(updateRes.modifiedCount, 2);

        const deleteRes = await col.deleteMany({ role: "member" });
        assert.equal(deleteRes.deletedCount, 2);

        const remaining = await col.countDocuments({});
        assert.equal(remaining, 1);
      } finally {
        await harness.teardown(db);
      }
    });

    it("11. returned documents are isolated copies and insertOne does not mutate input object", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; data: { count: number } }>("contract_isolation");
        const originalInput = { id: "1", data: { count: 10 } };
        const keysBefore = Object.keys(originalInput);

        await col.insertOne(originalInput);

        // Input object must not be mutated with _id by database driver
        assert.deepEqual(
          Object.keys(originalInput),
          keysBefore,
          "insertOne must not mutate caller's input object by injecting _id",
        );

        const doc1 = await col.findOne({ id: "1" });
        assert.ok(doc1);
        doc1.data.count = 999; // mutate returned copy

        const doc2 = await col.findOne({ id: "1" });
        assert.ok(doc2);
        assert.equal(
          doc2.data.count,
          10,
          "Mutating returned document must not corrupt database storage",
        );
      } finally {
        await harness.teardown(db);
      }
    });

    it("12. unsupported operator or multi-sort throws fail-closed error", async () => {
      const db = await harness.setup();
      try {
        const col = db.collection<{ id: string; x: number }>("contract_fail_closed");
        await col.insertOne({ id: "1", x: 10 });

        // Querying with unsupported operator $where or arbitrary invalid operator must fail-closed
        await assert.rejects(
          async () => {
            await col.find({ x: { $unsupportedOperator: true } });
          },
          /unsupported|operator/i,
          "Unsupported operator must throw fail-closed error instead of silently returning false",
        );
      } finally {
        await harness.teardown(db);
      }
    });
  });
}
