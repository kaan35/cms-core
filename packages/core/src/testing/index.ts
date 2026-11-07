export { InMemoryCollection, InMemoryDatabase, createInMemoryDb } from "./InMemoryDatabase.js";
export { InMemoryCache, createInMemoryCache } from "./InMemoryCache.js";
export {
  FailingCache,
  FailingDatabase,
  createFailingCache,
  createFailingDatabase,
} from "./failingAdapters.js";
export { runDatabaseContract, type DatabaseContractHarness } from "./databaseContract.js";
export { runCacheContract, type CacheContractHarness } from "./cacheContract.js";

// Common test helpers re-exported for convenience
export { DuplicateKeyError } from "../errors/AppError.js";
export { stubLogger } from "../services/LogService.js";
export { decorateTestAuth } from "../testUtils.js";
