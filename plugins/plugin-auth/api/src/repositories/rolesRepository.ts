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

export interface RoleFilter {
  search?: string | undefined;
  isSystem?: boolean | undefined;
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
      isSystem?: boolean | undefined;
      permissions?: string[] | undefined;
    },
  ): Promise<RoleDoc | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: RoleDoc = {
      ...existing,
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      isSystem: data.isSystem !== undefined ? data.isSystem : existing.isSystem,
      permissions: data.permissions ?? existing.permissions,
      updatedAt: new Date(),
    };

    await this.collection.updateOne({ id }, { $set: updated });
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteById(id);
  }

  async deleteById(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing || existing.isSystem) return false;
    await this.collection.deleteOne({ id });
    return true;
  }

  async findAll(): Promise<RoleDoc[]> {
    return this.list();
  }

  async findPaginated(
    page = 1,
    limit = 50,
    filter?: RoleFilter,
  ): Promise<{ items: RoleDoc[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filter?.isSystem !== undefined) {
      query["isSystem"] = filter.isSystem;
    }
    if (filter?.search?.trim()) {
      const s = filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query["$or"] = [
        { name: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
      ];
    }
    const skip = Math.max(0, (page - 1) * limit);
    const [items, total] = await Promise.all([
      this.collection.find(query, { skip, limit, sort: { createdAt: 1 } }),
      this.collection.countDocuments(query),
    ]);
    return { items, total };
  }

  async list(): Promise<RoleDoc[]> {
    return this.collection.find({}, { sort: { createdAt: 1 } });
  }
}
