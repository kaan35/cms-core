import type { ICollection, IDatabase } from "@cms/core";
import crypto from "node:crypto";

export interface ApiTokenDoc extends Record<string, unknown> {
  id: string;
  userId: string;
  name: string;
  tokenHash: string; // SHA-256
  tokenPrefix: string; // "cms_token_...abcd"
  scopes: string[]; // e.g. ["*"]
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  encryptedToken?: string | undefined;
}

export interface CreateApiTokenData {
  id?: string | undefined;
  userId: string;
  name: string;
  tokenHash: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  encryptedToken?: string | undefined;
}

export interface ApiTokenFilter {
  search?: string | undefined;
  scope?: "all" | "full" | "scoped" | undefined;
}

export class ApiTokensRepository {
  private readonly collection: ICollection<ApiTokenDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<ApiTokenDoc>("cms_api_tokens");
  }

  async findById(id: string): Promise<ApiTokenDoc | null> {
    return this.collection.findOne({ id });
  }

  async findByHash(tokenHash: string): Promise<ApiTokenDoc | null> {
    return this.collection.findOne({ tokenHash });
  }

  async findByUserId(userId: string): Promise<ApiTokenDoc[]> {
    return this.collection.find({ userId }, { sort: { createdAt: -1 } });
  }

  async findPaginatedByUserId(
    userId: string,
    page = 1,
    limit = 20,
    filter?: ApiTokenFilter,
  ): Promise<{ items: ApiTokenDoc[]; total: number }> {
    const query: Record<string, unknown> = { userId };
    if (filter?.scope === "full") {
      query["scopes"] = "*";
    } else if (filter?.scope === "scoped") {
      query["scopes"] = { $ne: "*" };
    }
    if (filter?.search?.trim()) {
      const s = filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query["$or"] = [
        { name: { $regex: s, $options: "i" } },
        { tokenPrefix: { $regex: s, $options: "i" } },
        { scopes: { $regex: s, $options: "i" } },
      ];
    }
    const skip = Math.max(0, (page - 1) * limit);
    const [items, total] = await Promise.all([
      this.collection.find(query, { skip, limit, sort: { createdAt: -1 } }),
      this.collection.countDocuments(query),
    ]);
    return { items, total };
  }

  async create(data: CreateApiTokenData): Promise<ApiTokenDoc> {
    const doc: ApiTokenDoc = {
      id: data.id || crypto.randomUUID(),
      userId: data.userId,
      name: data.name,
      tokenHash: data.tokenHash,
      tokenPrefix: data.tokenPrefix,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
      lastUsedAt: null,
      createdAt: new Date(),
      encryptedToken: data.encryptedToken || undefined,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async updateLastUsedAt(id: string, date: Date): Promise<void> {
    await this.collection.updateOne({ id }, { $set: { lastUsedAt: date } });
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  async deleteByUserId(userId: string): Promise<void> {
    const tokens = await this.collection.find({ userId });
    await Promise.all(tokens.map((token) => this.collection.deleteOne({ id: token.id })));
  }
}
