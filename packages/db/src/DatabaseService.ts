import type { Collection, Db, Document } from "mongodb";
import { MongoClient } from "mongodb";
import { config } from "@cms/core/ConfigService";
import { logger } from "@cms/core/LogService";

export class DatabaseService {
  private client: MongoClient;
  private db?: Db;

  private wasDisconnected = false;
  private lastErrorLogTime = 0;

  constructor() {
    this.client = new MongoClient(config.MONGO_URI);

    // Handle background reconnection monitoring
    this.client.on("serverHeartbeatSucceeded", () => {
      if (this.wasDisconnected) {
        logger.info("♻️ MongoDB Connection Recovered");
        this.wasDisconnected = false;
      }
    });

    this.client.on("serverHeartbeatFailed", (event) => {
      this.wasDisconnected = true;
      const now = Date.now();
      if (now - this.lastErrorLogTime > 10000) {
        logger.error({ message: event.failure.message }, "MongoDB Heartbeat Failed");
        this.lastErrorLogTime = now;
      }
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(config.MONGO_DB_NAME);
      logger.info(`🔌 Connected to MongoDB [${config.MONGO_DB_NAME}]`);
    } catch (error) {
      this.wasDisconnected = true;
      logger.error({ message: (error as Error).message }, "❌ MongoDB Connection Error");
      throw error;
    }
  }

  getCollection<T extends Document>(name: string): Collection<T> {
    if (!this.db) throw new Error("Database not connected");
    return this.db.collection<T>(name);
  }

  getDb(): Db {
    if (!this.db) throw new Error("Database not connected");
    return this.db;
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    logger.info("🔌 Disconnected from MongoDB");
  }
}

export const database = new DatabaseService();
