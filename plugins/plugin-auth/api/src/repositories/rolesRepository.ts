import type { ICollection, IDatabase } from "@cms/core";
import crypto from "node:crypto";

export interface RoleDoc extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string | undefined;
  permissions: string[];
  isSystem?: boolean | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export class RolesRepository {
  private readonly collection: ICollection<RoleDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<RoleDoc>("cms_roles");
  }

  async findByName(name: string): Promise<RoleDoc | null> {
    return this.collection.findOne({ name });
  }

  async findById(id: string): Promise<RoleDoc | null> {
    return this.collection.findOne({ id });
  }

  async findByIds(ids: string[]): Promise<RoleDoc[]> {
    if (!ids || ids.length === 0) return [];
    return this.collection.find({
      $or: [{ id: { $in: ids } }, { name: { $in: ids } }],
    });
  }

  async create(data: {
    name: string;
    description?: string | undefined;
    permissions: string[];
    isSystem?: boolean | undefined;
  }): Promise<RoleDoc> {
    const now = new Date();
    const doc: RoleDoc = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      permissions: data.permissions,
      isSystem: data.isSystem ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async update(
    id: string,
    data: {
      name?: string | undefined;
      description?: string | undefined;
      permissions?: string[] | undefined;
    },
  ): Promise<RoleDoc | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: RoleDoc = {
      ...existing,
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      permissions: data.permissions ?? existing.permissions,
      updatedAt: new Date(),
    };

    await this.collection.updateOne({ id }, { $set: updated });
    return updated;
  }

  async deleteById(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing || existing.isSystem) return false;
    await this.collection.deleteOne({ id });
    return true;
  }

  async list(): Promise<RoleDoc[]> {
    return this.collection.find({}, { sort: { createdAt: 1 } });
  }
}
