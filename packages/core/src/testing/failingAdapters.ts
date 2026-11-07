import type { ICache, ICollection, IDatabase } from "../index.js";
import { createInMemoryDb } from "./InMemoryDatabase.js";

class FailingCollection<T extends Record<string, unknown>> implements ICollection<T> {
  private readonly error: Error;

  constructor(error: Error) {
    this.error = error;
  }

  async findOne(): Promise<T | null> {
    throw this.error;
  }

  async find(): Promise<T[]> {
    throw this.error;
  }

  async insertOne(): Promise<void> {
    throw this.error;
  }

  async insertMany(): Promise<void> {
    throw this.error;
  }

  async updateOne(): Promise<void> {
    throw this.error;
  }

  async updateMany(): Promise<{ modifiedCount: number }> {
    throw this.error;
  }

  async deleteOne(): Promise<void> {
    throw this.error;
  }

  async deleteMany(): Promise<{ deletedCount: number }> {
    throw this.error;
  }

  async countDocuments(): Promise<number> {
    throw this.error;
  }

  async createIndex(): Promise<void> {
    throw this.error;
  }
}

export interface FailingDatabaseOptions {
  message?: string;
  isAliveThrows?: boolean;
}

export class FailingDatabase implements IDatabase {
  private readonly error: Error;
  private readonly innerDb: IDatabase;
  private readonly isAliveThrows: boolean;

  constructor(options?: FailingDatabaseOptions | string) {
    const opts = typeof options === "string" ? { message: options } : (options ?? {});
    this.error = new Error(opts.message ?? "Database connection failed");
    this.innerDb = createInMemoryDb();
    this.isAliveThrows = Boolean(opts.isAliveThrows);
  }

  collection<T extends Record<string, unknown>>(name: string): ICollection<T> {
    if (this.isAliveThrows) {
      return this.innerDb.collection<T>(name);
    }
    return new FailingCollection<T>(this.error);
  }

  async isAlive(): Promise<boolean> {
    if (this.isAliveThrows) {
      throw this.error;
    }
    return false;
  }

  async connect(): Promise<void> {
    throw this.error;
  }

  async disconnect(): Promise<void> {
    throw this.error;
  }
}

export class FailingCache implements ICache {
  private readonly error: Error;

  constructor(message = "Redis connection failed") {
    this.error = new Error(message);
  }

  async get(): Promise<string | null> {
    throw this.error;
  }

  async set(): Promise<void> {
    throw this.error;
  }

  async del(): Promise<void> {
    throw this.error;
  }

  async isAlive(): Promise<boolean> {
    return false;
  }

  async quit(): Promise<void> {
    throw this.error;
  }

  async getJson<T>(): Promise<T | null> {
    throw this.error;
  }

  async setJson(): Promise<void> {
    throw this.error;
  }

  async getOrSet<T>(): Promise<T> {
    throw this.error;
  }
}

export function createFailingDatabase(options?: FailingDatabaseOptions | string): IDatabase {
  return new FailingDatabase(options);
}

export function createFailingCache(message?: string): ICache {
  return new FailingCache(message);
}
