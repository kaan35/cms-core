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

  async update(
    id: string,
    update: Partial<Omit<UserDoc, "id" | "createdAt">>,
  ): Promise<UserDoc | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated: UserDoc = {
      ...existing,
      ...update,
      updatedAt: new Date(),
    };
    await this.collection.updateOne({ id }, { $set: updated });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  async deleteById(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  async findByRoleId(roleId: string): Promise<UserDoc[]> {
    return this.collection.find({ roleIds: roleId });
  }

  async findPaginated(page = 1, limit = 50): Promise<{ items: UserDoc[]; total: number }> {
    const skip = Math.max(0, (page - 1) * limit);
    const [items, total] = await Promise.all([
      this.collection.find({}, { skip, limit, sort: { createdAt: -1 } }),
      this.collection.countDocuments(),
    ]);
    return { items, total };
  }

  async list(skip = 0, limit = 50): Promise<UserDoc[]> {
    return this.collection.find({}, { skip, limit, sort: { createdAt: -1 } });
  }
}
