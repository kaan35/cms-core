import type { ICollection, IDatabase } from "@cms/core";
import crypto from "node:crypto";

export interface UserDoc extends Record<string, unknown> {
  id: string;
  email: string;
  name?: string | undefined;
  passwordHash: string;
  roleIds: string[];
  permissions?: string[] | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export class UsersRepository {
  private readonly collection: ICollection<UserDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<UserDoc>("cms_users");
  }

  async findByEmail(email: string): Promise<UserDoc | null> {
    return this.collection.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id: string): Promise<UserDoc | null> {
    return this.collection.findOne({ id });
  }

  async count(): Promise<number> {
    return this.collection.countDocuments();
  }

  async create(data: {
    email: string;
    passwordHash: string;
    roleIds: string[];
    name?: string | undefined;
    permissions?: string[] | undefined;
  }): Promise<UserDoc> {
    const now = new Date();
    const doc: UserDoc = {
      id: crypto.randomUUID(),
      email: data.email.toLowerCase().trim(),
      name: data.name?.trim(),
      passwordHash: data.passwordHash,
      roleIds: data.roleIds,
      permissions: data.permissions,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async update(id: string, update: Partial<Omit<UserDoc, "id" | "createdAt">>): Promise<void> {
    await this.collection.updateOne({ id }, { $set: { ...update, updatedAt: new Date() } });
  }

  async deleteById(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  async list(skip = 0, limit = 50): Promise<UserDoc[]> {
    return this.collection.find({}, { skip, limit, sort: { createdAt: -1 } });
  }
}
