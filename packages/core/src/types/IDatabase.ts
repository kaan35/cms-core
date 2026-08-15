export interface FindOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

export interface UpdateOptions {
  upsert?: boolean;
}

export interface CreateIndexOptions {
  unique?: boolean;
  sparse?: boolean;
}

export interface ICollection<T extends Record<string, unknown>> {
  findOne(filter: Record<string, unknown>): Promise<T | null>;
  find(filter?: Record<string, unknown>, options?: FindOptions): Promise<T[]>;
  insertOne(doc: Record<string, unknown>): Promise<void>;
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: UpdateOptions,
  ): Promise<void>;
  deleteOne(filter: Record<string, unknown>): Promise<void>;
  countDocuments(filter?: Record<string, unknown>): Promise<number>;
  createIndex(spec: Record<string, unknown>, options?: CreateIndexOptions): Promise<void>;
}

export interface IDatabase {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isAlive(): Promise<boolean>;
  collection<T extends Record<string, unknown>>(name: string): ICollection<T>;
}
