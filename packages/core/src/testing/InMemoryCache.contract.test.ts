import { runCacheContract, type CacheContractHarness } from "./cacheContract.js";
import { createInMemoryCache } from "./InMemoryCache.js";
import type { ICache } from "../index.js";

let simulatedNow = 1000000;

const harness: CacheContractHarness = {
  name: "InMemoryCache (Port Fake)",
  async setup(): Promise<ICache> {
    simulatedNow = 1000000;
    return createInMemoryCache(() => simulatedNow);
  },
  async teardown(cache: ICache): Promise<void> {
    await cache.quit();
  },
  async advanceTime(ms: number): Promise<void> {
    simulatedNow += ms;
  },
};

runCacheContract(harness);
