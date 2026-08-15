import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ICache } from "./types/ICache.js";

const stubCache: ICache = {
  get: async (_key: string) => null,
  set: async (_key: string, _value: string, _ttl?: number) => {},
  del: async (..._keys: string[]) => {},
  quit: async () => {},
};

describe("ICache contract", () => {
  it("get returns null for unknown keys (stub)", async () => {
    assert.equal(await stubCache.get("missing"), null);
  });

  it("set and del accept correct argument shapes", async () => {
    // Just verifying the stub satisfies the interface without throws
    await assert.doesNotReject(() => stubCache.set("k", "v"));
    await assert.doesNotReject(() => stubCache.set("k", "v", 60));
    await assert.doesNotReject(() => stubCache.del("k1", "k2"));
  });
});
