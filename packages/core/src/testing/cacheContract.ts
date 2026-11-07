import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ICache } from "../index.js";

export interface CacheContractHarness {
  readonly name: string;
  setup(): Promise<ICache>;
  teardown(cache: ICache): Promise<void>;
  advanceTime(ms: number): Promise<void>;
}

export function runCacheContract(harness: CacheContractHarness): void {
  describe(`ICache Contract Suite: ${harness.name}`, () => {
    it("1. get/set/del basic string keys", async () => {
      const cache = await harness.setup();
      try {
        const nonExistent = await cache.get("contract:not:found");
        assert.equal(nonExistent, null);

        await cache.set("contract:key1", "val1");
        const val1 = await cache.get("contract:key1");
        assert.equal(val1, "val1");

        await cache.del("contract:key1");
        const afterDel = await cache.get("contract:key1");
        assert.equal(afterDel, null);
      } finally {
        await harness.teardown(cache);
      }
    });

    it("2. del handles multiple keys in one call", async () => {
      const cache = await harness.setup();
      try {
        await cache.set("contract:multi:1", "a");
        await cache.set("contract:multi:2", "b");
        await cache.set("contract:multi:3", "c");

        await cache.del("contract:multi:1", "contract:multi:2", "contract:multi:3");

        assert.equal(await cache.get("contract:multi:1"), null);
        assert.equal(await cache.get("contract:multi:2"), null);
        assert.equal(await cache.get("contract:multi:3"), null);
      } finally {
        await harness.teardown(cache);
      }
    });

    it("3. getJson / setJson serializes and isolates objects", async () => {
      const cache = await harness.setup();
      try {
        const payload = { userId: "user-1", roles: ["admin", "editor"], active: true };
        await cache.setJson("contract:json:user", payload);

        const retrieved = await cache.getJson<typeof payload>("contract:json:user");
        assert.deepEqual(retrieved, payload);

        // Mutating retrieved object should not affect cache
        if (retrieved) {
          retrieved.roles.push("hacker");
        }
        const retrieved2 = await cache.getJson<typeof payload>("contract:json:user");
        assert.deepEqual(retrieved2, payload);
      } finally {
        await harness.teardown(cache);
      }
    });

    it("4. getOrSet invokes factory only on cache miss and reuses cached value on hit", async () => {
      const cache = await harness.setup();
      try {
        await cache.del("contract:getOrSet");
        let callCount = 0;
        const factory = async () => {
          callCount++;
          return { generated: true, timestamp: 12345 };
        };

        const res1 = await cache.getOrSet("contract:getOrSet", factory, 60);
        assert.equal(callCount, 1);
        assert.deepEqual(res1, { generated: true, timestamp: 12345 });

        const res2 = await cache.getOrSet("contract:getOrSet", factory, 60);
        assert.equal(callCount, 1, "Factory must not be invoked on cache hit");
        assert.deepEqual(res2, { generated: true, timestamp: 12345 });
      } finally {
        await cache.del("contract:getOrSet").catch(() => {});
        await harness.teardown(cache);
      }
    });

    it("5. getOrSet does not cache null return values (avoids ghost null caching)", async () => {
      const cache = await harness.setup();
      try {
        await cache.del("contract:null:check");
        let factoryCalls = 0;
        const factoryReturningNull = async () => {
          factoryCalls++;
          return null;
        };

        const first = await cache.getOrSet("contract:null:check", factoryReturningNull, 60);
        assert.equal(first, null);
        assert.equal(factoryCalls, 1);

        const raw = await cache.get("contract:null:check");
        assert.equal(
          raw,
          null,
          "Returning null from factory must not write 'null' string into cache",
        );

        const second = await cache.getOrSet("contract:null:check", factoryReturningNull, 60);
        assert.equal(second, null);
        assert.equal(
          factoryCalls,
          2,
          "Next request must call factory again rather than serving cached 'null'",
        );
      } finally {
        await cache.del("contract:null:check").catch(() => {});
        await harness.teardown(cache);
      }
    });

    it("6. expires entries after TTL", async () => {
      const cache = await harness.setup();
      try {
        await cache.set("contract:ttl:short", "temporary", 1); // 1 second TTL

        const immediate = await cache.get("contract:ttl:short");
        assert.equal(immediate, "temporary");

        // Advance time by 1.1 seconds
        await harness.advanceTime(1100);

        const afterExpiry = await cache.get("contract:ttl:short");
        assert.equal(afterExpiry, null, "Cache key must expire after TTL seconds");
      } finally {
        await harness.teardown(cache);
      }
    });

    it("7. handles ttl <= 0 safely without crashing", async () => {
      const cache = await harness.setup();
      try {
        await cache.set("contract:zero:ttl", "value", 0);
        const val = await cache.get("contract:zero:ttl");
        assert.equal(val, null, "TTL <= 0 must not crash and should immediately delete/expire key");
      } finally {
        await harness.teardown(cache);
      }
    });
  });
}
