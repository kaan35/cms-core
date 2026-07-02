import type { Collection, Db, Document } from "mongodb";
import { MongoClient } from "mongodb";
import type { ILogger } from "@cms/core";

export interface DatabaseConfig {
  MONGO_URI: string;
  MONGO_DB_NAME: string;
}

export class DatabaseService {
  private client?: MongoClient;
  private db?: Db;

  private wasDisconnected = false;
  private lastErrorLogTime = 0;
  private config?: DatabaseConfig;
  private logger?: ILogger;

  constructor(config?: DatabaseConfig, logger?: ILogger) {
    this.config = config;
    this.logger = logger;
  }

  async connect(config?: DatabaseConfig, logger?: ILogger, maxRetries = 5, baseDelay = 1000): Promise<void> {
    if (config) this.config = config;
    if (logger) this.logger = logger;

    if (!this.config) {
      throw new Error("DatabaseConfig is required to connect");
    }

    this.client = new MongoClient(this.config.MONGO_URI);

    // Handle background reconnection monitoring
    this.client.on("serverHeartbeatSucceeded", () => {
      if (this.wasDisconnected) {
        this.logger?.info("♻️ MongoDB Connection Recovered");
        this.wasDisconnected = false;
      }
    });

    this.client.on("serverHeartbeatFailed", (event) => {
      this.wasDisconnected = true;
      const now = Date.now();
      if (now - this.lastErrorLogTime > 10000) {
        this.logger?.error({ message: event.failure.message }, "MongoDB Heartbeat Failed");
        this.lastErrorLogTime = now;
      }
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.client.connect();
        this.db = this.client.db(this.config.MONGO_DB_NAME);
        this.logger?.info(`🔌 Connected to MongoDB [${this.config.MONGO_DB_NAME}]`);
        return;
      } catch (error) {
        this.wasDisconnected = true;
        const delay = baseDelay * Math.pow(2, attempt - 1);
        
        if (attempt < maxRetries) {
          this.logger?.warn(
            `MongoDB connection failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this.logger?.error(
            { message: (error as Error).message }, 
            "❌ MongoDB connection failed after all retries"
          );
          throw error;
        }
      }
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
    if (this.client) {
      await this.client.close();
    }
    this.logger?.info("🔌 Disconnected from MongoDB");
  }
}

export const database = new DatabaseService();
