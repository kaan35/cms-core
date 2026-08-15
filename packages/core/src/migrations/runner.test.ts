import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ICollection, IDatabase } from "../types/IDatabase.js";
import type { Migration } from "../types/plugin.js";
import { runMigrations } from "./runner.js";

const stubLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

function makeDb(alreadyApplied: string[] = []): {
  db: IDatabase;
  inserted: string[];
} {
  const inserted: string[] = [];

  const migrationsCollection: ICollection<Record<string, unknown>> = {
    findOne: async () => null,
    find: async () => alreadyApplied.map((id) => ({ id, appliedAt: new Date() })),
    insertOne: async (doc) => {
      inserted.push(doc["id"] as string);
    },
    updateOne: async () => {},
    deleteOne: async () => {},
    countDocuments: async () => alreadyApplied.length,
    createIndex: async () => {},
  };

  const db: IDatabase = {
    connect: async () => {},
    disconnect: async () => {},
    collection: () => migrationsCollection as unknown as ICollection<any>,
  };

  return { db, inserted };
}

describe("runMigrations", () => {
  it("runs pending migrations in ascending id order", async () => {
    const ran: string[] = [];
    const migrations: Migration[] = [
      {
        id: "202608150002_b",
        up: async () => {
          ran.push("b");
        },
      },
      {
        id: "202608150001_a",
        up: async () => {
          ran.push("a");
        },
      },
    ];
    const { db, inserted } = makeDb();

    await runMigrations(db, stubLogger, migrations);

    assert.deepEqual(ran, ["a", "b"]);
    assert.deepEqual(inserted, ["202608150001_a", "202608150002_b"]);
  });

  it("skips already-applied migrations", async () => {
    const ran: string[] = [];
    const migrations: Migration[] = [
      {
        id: "202608150001_a",
        up: async () => {
          ran.push("a");
        },
      },
      {
        id: "202608150002_b",
        up: async () => {
          ran.push("b");
        },
      },
    ];
    const { db } = makeDb(["202608150001_a"]);

    await runMigrations(db, stubLogger, migrations);

    assert.deepEqual(ran, ["b"]); // 'a' already applied, only 'b' runs
  });

  it("does nothing when all migrations are already applied", async () => {
    const ran: string[] = [];
    const migrations: Migration[] = [
      {
        id: "202608150001_a",
        up: async () => {
          ran.push("a");
        },
      },
    ];
    const { db } = makeDb(["202608150001_a"]);

    await runMigrations(db, stubLogger, migrations);
    assert.deepEqual(ran, []);
  });

  it("throws and does not apply subsequent migrations on failure (fail-closed)", async () => {
    const ran: string[] = [];
    const migrations: Migration[] = [
      {
        id: "202608150001_fails",
        up: async () => {
          throw new Error("db error");
        },
      },
      {
        id: "202608150002_should_not_run",
        up: async () => {
          ran.push("second");
        },
      },
    ];
    const { db, inserted } = makeDb();

    await assert.rejects(() => runMigrations(db, stubLogger, migrations), { message: "db error" });

    assert.deepEqual(inserted, []);
    assert.deepEqual(ran, []);
  });

  it("records each migration as applied on success", async () => {
    const migrations: Migration[] = [
      { id: "202608150001_a", up: async () => {} },
      { id: "202608150002_b", up: async () => {} },
    ];
    const { db, inserted } = makeDb();

    await runMigrations(db, stubLogger, migrations);
    assert.deepEqual(inserted, ["202608150001_a", "202608150002_b"]);
  });
});
