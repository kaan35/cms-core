import type { Collection, Db, Document } from "mongodb";
import { MongoClient } from "mongodb";

export interface DatabaseConfig {
  MONGO_URI: string;
  MONGO_DB_NAME: string;
}

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  error: (data: any, message: string) => void;
  warn: (message: string, ...args: any[]) => void;
}

export class DatabaseService {
  private client?: MongoClient;
  private db?: Db;

  private wasDisconnected = false;
  private lastErrorLogTime = 0;
  private config?: DatabaseConfig;
  private logger?: Logger;

  async connect(config: DatabaseConfig, logger: Logger, maxRetries = 5, baseDelay = 1000): Promise<void> {
    this.config = config;
    this.logger = logger;
    this.client = new MongoClient(config.MONGO_URI);

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
