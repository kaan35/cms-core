import type { ICollection, IDatabase } from "@cms/core";
import crypto from "node:crypto";

export interface SessionDoc extends Record<string, unknown> {
  id: string;
  userId: string;
  userAgent?: string | undefined;
  ip?: string | undefined;
  expiresAt: Date;
  createdAt: Date;
}

export class SessionsRepository {
  private readonly collection: ICollection<SessionDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<SessionDoc>("cms_sessions");
  }

  async findById(id: string): Promise<SessionDoc | null> {
    return this.collection.findOne({ id });
  }

  async findByUserId(userId: string): Promise<SessionDoc[]> {
    return this.collection.find({ userId }, { sort: { createdAt: -1 } });
  }

  async create(data: {
    userId: string;
    expiresAt: Date;
    userAgent?: string | undefined;
    ip?: string | undefined;
  }): Promise<SessionDoc> {
    const doc: SessionDoc = {
      id: crypto.randomUUID(),
      userId: data.userId,
      userAgent: data.userAgent,
      ip: data.ip,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async updateExpiresAt(id: string, expiresAt: Date): Promise<void> {
    await this.collection.updateOne({ id }, { $set: { expiresAt } });
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.collection.deleteOne({ userId });
  }

  async deleteAll(): Promise<void> {
    await this.collection.deleteOne({});
  }
}
