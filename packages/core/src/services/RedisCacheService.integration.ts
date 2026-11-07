import { runCacheContract, type CacheContractHarness } from "../testing/cacheContract.js";
import { RedisCacheService } from "./RedisCacheService.js";
import { stubLogger } from "./LogService.js";
import type { ICache } from "../index.js";
import { createClient } from "redis";

const TEST_REDIS_URL = process.env["TEST_REDIS_URL"] || "redis://127.0.0.1:6381";

const harness: CacheContractHarness = {
  name: "RedisCacheService (Redis 8 Real Adapter)",
  async setup(): Promise<ICache> {
    const cache = new RedisCacheService(TEST_REDIS_URL, stubLogger);
    await cache.connect();
    return cache;
  },
  async teardown(cache: ICache): Promise<void> {
    try {
      const client = createClient({ url: TEST_REDIS_URL });
      await client.connect();
      await client.flushDb();
      await client.quit();
    } catch {
      // Ignore cleanup error if already disconnected
    }
    await cache.quit();
  },
  async advanceTime(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  },
};

runCacheContract(harness);
