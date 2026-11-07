import { runDatabaseContract, type DatabaseContractHarness } from "./databaseContract.js";
import { createInMemoryDb } from "./InMemoryDatabase.js";
import type { IDatabase } from "../index.js";

const harness: DatabaseContractHarness = {
  name: "InMemoryDatabase (Port Fake)",
  async setup(): Promise<IDatabase> {
    return createInMemoryDb();
  },
  async teardown(_db: IDatabase): Promise<void> {},
  async createUniqueCollection(
    db: IDatabase,
    collectionName: string,
    field: string,
  ): Promise<void> {
    const col = db.collection(collectionName);
    await col.createIndex({ [field]: 1 }, { unique: true });
  },
};

runDatabaseContract(harness);
