import type { ICollection, IDatabase } from "@cms/core";
import crypto from "node:crypto";

export interface RoleDoc extends Record<string, unknown> {
  id: string;
  name: string;
  permissions: string[];
  isSystem?: boolean;
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
    if (ids.length === 0) return [];
    return this.collection.find({ id: { $in: ids } });
  }

  async create(data: {
    name: string;
    permissions: string[];
    isSystem?: boolean;
  }): Promise<RoleDoc> {
    const now = new Date();
    const doc: RoleDoc = {
      id: crypto.randomUUID(),
      name: data.name,
      permissions: data.permissions,
      isSystem: data.isSystem ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async list(): Promise<RoleDoc[]> {
    return this.collection.find({}, { sort: { createdAt: 1 } });
  }
}
