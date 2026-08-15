import type {
  CreateIndexOptions,
  FindOptions,
  ICollection,
  IDatabase,
  ILogger,
  UpdateOptions,
} from "@cms/core";
import {
  MongoClient,
  type Collection,
  type Db,
  type Document,
  type Filter,
  type IndexSpecification,
  type Sort,
} from "mongodb";

class MongoCollectionAdapter<T extends Record<string, unknown>> implements ICollection<T> {
  private readonly col: Collection<Document>;

  constructor(col: Collection<Document>) {
    this.col = col;
  }

  async findOne(filter: Record<string, unknown>): Promise<T | null> {
    return (await this.col.findOne(filter as Filter<Document>)) as unknown as T | null;
  }

  async find(filter: Record<string, unknown> = {}, options: FindOptions = {}): Promise<T[]> {
    const cursor = this.col.find(filter as Filter<Document>);
    if (options.sort) {
      cursor.sort(options.sort as Sort);
    }
    if (options.skip !== undefined) {
      cursor.skip(options.skip);
    }
    if (options.limit !== undefined) {
      cursor.limit(options.limit);
    }
    return (await cursor.toArray()) as unknown as T[];
  }

  async insertOne(doc: Record<string, unknown>): Promise<void> {
    await this.col.insertOne(doc);
  }

  async updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: UpdateOptions = {},
  ): Promise<void> {
    await this.col.updateOne(filter as Filter<Document>, update, {
      upsert: options.upsert ?? false,
    });
  }

  async deleteOne(filter: Record<string, unknown>): Promise<void> {
    await this.col.deleteOne(filter as Filter<Document>);
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    return this.col.countDocuments(filter as Filter<Document>);
  }

  async createIndex(
    spec: Record<string, unknown>,
    options: CreateIndexOptions = {},
  ): Promise<void> {
    await this.col.createIndex(spec as IndexSpecification, options);
  }
}

export class DatabaseService implements IDatabase {
  private readonly uri: string;
  private readonly dbName: string;
  private readonly logger: ILogger;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor(uri: string, dbName: string, logger: ILogger) {
    this.uri = uri;
    this.dbName = dbName;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    this.client = new MongoClient(this.uri, {
      serverSelectionTimeoutMS: 5_000, // fail fast on unreachable host
    });
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.logger.info("Connected to MongoDB", { db: this.dbName });
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
    this.logger.info("Disconnected from MongoDB");
  }

  async isAlive(): Promise<boolean> {
    try {
      if (this.db === null) return false;
      const res = await this.db.command({ ping: 1 });
      return Boolean(res && res["ok"] === 1);
    } catch {
      return false;
    }
  }

  collection<T extends Record<string, unknown>>(name: string): ICollection<T> {
    if (this.db === null) {
      throw new Error("DatabaseService not connected — call connect() first");
    }
    return new MongoCollectionAdapter<T>(this.db.collection(name));
  }
}
