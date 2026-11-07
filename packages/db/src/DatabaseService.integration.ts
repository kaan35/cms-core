import { runDatabaseContract, type DatabaseContractHarness, stubLogger } from "@cms/core/testing";
import { DatabaseService } from "./DatabaseService.js";
import type { IDatabase } from "@cms/core";
import { MongoClient } from "mongodb";

const TEST_MONGO_URL = process.env["TEST_MONGO_URL"] || "mongodb://127.0.0.1:27019/cms_test";
const TEST_DB_NAME = "cms_test";

const harness: DatabaseContractHarness = {
  name: "DatabaseService (MongoDB 8 Real Adapter)",
  async setup(): Promise<IDatabase> {
    const db = new DatabaseService(TEST_MONGO_URL, TEST_DB_NAME, stubLogger);
    await db.connect();
    return db;
  },
  async teardown(db: IDatabase): Promise<void> {
    try {
      const client = new MongoClient(TEST_MONGO_URL);
      await client.connect();
      await client.db(TEST_DB_NAME).dropDatabase();
      await client.close();
    } catch {
      // Ignore cleanup error if database was already dropped
    }
    await db.disconnect();
  },
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
