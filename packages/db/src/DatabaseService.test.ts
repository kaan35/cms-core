import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DatabaseService } from "./DatabaseService.js";

const stubLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

describe("DatabaseService", () => {
  it("collection() throws before connect() is called", () => {
    const db = new DatabaseService("mongodb://localhost:27017", "test", stubLogger);
    assert.throws(() => db.collection("anything"), /not connected/);
  });

  it("connect() fails fast on unreachable host (serverSelectionTimeoutMS: 5000)", async () => {
    const db = new DatabaseService("mongodb://localhost:1", "test", stubLogger);
    await assert.rejects(
      () => db.connect(),
      (err: Error) => {
        assert.ok(err instanceof Error);
        return true;
      },
    );
  });
});
