import type { ICollection, IDatabase } from "@cms/core";

export class InMemoryCollection<T extends Record<string, unknown>> implements ICollection<T> {
  private readonly docs: T[] = [];

  constructor(initialDocs: T[] = []) {
    this.docs = initialDocs.map((d) => structuredClone(d));
  }

  async insertOne(doc: Record<string, unknown>): Promise<void> {
    this.docs.push(structuredClone(doc as T));
  }

  async findOne(filter: Record<string, unknown>): Promise<T | null> {
    const match = this.docs.find((d) => this.matchDoc(d, filter));
    return match ? structuredClone(match) : null;
  }

  async find(
    filter: Record<string, unknown> = {},
    options?: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> },
  ): Promise<T[]> {
    let res = this.docs.filter((d) => this.matchDoc(d, filter));

    if (options?.sort) {
      const [sortKey, sortOrder] = Object.entries(options.sort)[0] ?? [];
      if (sortKey && sortOrder !== undefined) {
        res.sort((a, b) => {
          const valA = a[sortKey];
          const valB = b[sortKey];
          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          const cmp = String(valA) > String(valB) ? 1 : -1;
          return sortOrder === -1 ? -cmp : cmp;
        });
      }
    }

    if (options?.skip) {
      res = res.slice(options.skip);
    }
    if (options?.limit !== undefined) {
      res = res.slice(0, options.limit);
    }

    return res.map((d) => structuredClone(d));
  }

  async updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean },
  ): Promise<void> {
    const idx = this.docs.findIndex((d) => this.matchDoc(d, filter));
    if (idx !== -1) {
      if (update["$set"] && typeof update["$set"] === "object") {
        this.docs[idx] = { ...this.docs[idx]!, ...update["$set"] };
      } else {
        this.docs[idx] = { ...this.docs[idx]!, ...update };
      }
    } else if (options?.upsert) {
      const newDoc =
        update["$set"] && typeof update["$set"] === "object"
          ? { ...filter, ...update["$set"] }
          : { ...filter, ...update };
      this.docs.push(newDoc as T);
    }
  }

  async deleteOne(filter: Record<string, unknown>): Promise<void> {
    const idx = this.docs.findIndex((d) => this.matchDoc(d, filter));
    if (idx !== -1) {
      this.docs.splice(idx, 1);
    }
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    return this.docs.filter((d) => this.matchDoc(d, filter)).length;
  }

  async createIndex(): Promise<void> {}

  private matchDoc(doc: T, filter: Record<string, unknown>): boolean {
    if (!filter || Object.keys(filter).length === 0) {
      return true;
    }

    return Object.entries(filter).every(([key, value]) => {
      if (key === "$or" && Array.isArray(value)) {
        return value.some((subFilter) => this.matchDoc(doc, subFilter as Record<string, unknown>));
      }
      if (key === "$text" && typeof value === "object" && value !== null) {
        const searchStr = String((value as { $search: string }).$search).toLowerCase();
        return Object.values(doc).some(
          (v) => typeof v === "string" && v.toLowerCase().includes(searchStr),
        );
      }
      if (
        value &&
        typeof value === "object" &&
        "$in" in value &&
        Array.isArray((value as { $in: unknown[] }).$in)
      ) {
        return (value as { $in: unknown[] }).$in.includes(doc[key]);
      }
      if (
        value &&
        typeof value === "object" &&
        "$regex" in value &&
        typeof (value as { $regex: unknown }).$regex === "string"
      ) {
        const pattern = (value as { $regex: string }).$regex;
        const options = (value as { $options?: string }).$options || "";
        const reg = new RegExp(pattern, options);
        return typeof doc[key] === "string" && reg.test(doc[key] as string);
      }
      return doc[key] === value;
    });
  }
}

export class InMemoryDatabase implements IDatabase {
  private readonly store = new Map<string, InMemoryCollection<Record<string, unknown>>>();

  collection<T extends Record<string, unknown>>(name: string): ICollection<T> {
    if (!this.store.has(name)) {
      this.store.set(name, new InMemoryCollection<Record<string, unknown>>());
    }
    return this.store.get(name)! as unknown as ICollection<T>;
  }

  async isAlive(): Promise<boolean> {
    return true;
  }

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}
}

export function createInMemoryDb(): IDatabase {
  return new InMemoryDatabase();
}
