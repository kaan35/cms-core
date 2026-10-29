import type { ICollection, IDatabase } from "@cms/core";
import { randomUUID } from "node:crypto";
import type {
  CreateVaultItemInput,
  UpdateVaultItemInput,
  VaultItemDoc,
} from "../domain/vault.rules.js";

export class VaultRepository {
  private readonly col: ICollection<VaultItemDoc>;

  constructor(db: IDatabase) {
    this.col = db.collection<VaultItemDoc>("cms_vault_items");
  }

  async create(input: CreateVaultItemInput): Promise<VaultItemDoc> {
    const now = new Date();
    const tags =
      typeof input.tags === "string"
        ? input.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : Array.isArray(input.tags)
          ? input.tags
          : [];

    const doc: VaultItemDoc = {
      id: randomUUID(),
      title: input.title,
      username: input.username ?? "",
      password: input.password,
      url: input.url ?? "",
      category: input.category ?? "General",
      notes: input.notes ?? "",
      tags,
      passwordChangedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await this.col.insertOne(doc);
    return doc;
  }

  async bulkCreate(items: CreateVaultItemInput[]): Promise<VaultItemDoc[]> {
    if (items.length === 0) return [];
    const docs: VaultItemDoc[] = [];
    const now = new Date();
    for (const input of items) {
      const tags =
        typeof input.tags === "string"
          ? input.tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : Array.isArray(input.tags)
            ? input.tags
            : [];

      const doc: VaultItemDoc = {
        id: randomUUID(),
        title: input.title,
        username: input.username ?? "",
        password: input.password,
        url: input.url ?? "",
        category: input.category ?? "General",
        notes: input.notes ?? "",
        tags,
        passwordChangedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      docs.push(doc);
    }
    await this.col.insertMany(docs);
    return docs;
  }

  private normalizeDoc(item: VaultItemDoc): VaultItemDoc {
    if (!item.passwordChangedAt) {
      return {
        ...item,
        passwordChangedAt: item.updatedAt || item.createdAt || new Date(),
      };
    }
    return item;
  }

  async findById(id: string): Promise<VaultItemDoc | null> {
    const item = await this.col.findOne({ id });
    if (!item) return null;
    return this.normalizeDoc(item);
  }

  async list(filterCategory?: string, search?: string): Promise<VaultItemDoc[]> {
    const filter: Record<string, unknown> = {};
    if (filterCategory && filterCategory !== "all") {
      filter["category"] = filterCategory;
    }
    if (search && search.trim() !== "") {
      const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter["$or"] = [
        { title: { $regex: s, $options: "i" } },
        { username: { $regex: s, $options: "i" } },
        { url: { $regex: s, $options: "i" } },
        { category: { $regex: s, $options: "i" } },
      ];
    }
    const all = await this.col.find(filter, { sort: { createdAt: -1 } });
    return all.map((item) => this.normalizeDoc(item));
  }

  async findPaginated(
    page = 1,
    limit = 20,
    filterCategory?: string,
    search?: string,
  ): Promise<{ items: VaultItemDoc[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (filterCategory && filterCategory !== "all") {
      filter["category"] = filterCategory;
    }
    if (search && search.trim() !== "") {
      const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter["$or"] = [
        { title: { $regex: s, $options: "i" } },
        { username: { $regex: s, $options: "i" } },
        { url: { $regex: s, $options: "i" } },
        { category: { $regex: s, $options: "i" } },
      ];
    }
    const skip = Math.max(0, (page - 1) * limit);
    const [items, total] = await Promise.all([
      this.col.find(filter, { skip, limit, sort: { createdAt: -1 } }),
      this.col.countDocuments(filter),
    ]);
    return {
      items: items.map((item) => this.normalizeDoc(item)),
      total,
    };
  }

  async getCategories(): Promise<string[]> {
    const items = await this.col.find({});
    const set = new Set<string>();
    for (const it of items) {
      if (it.category && it.category.trim()) {
        set.add(it.category.trim());
      }
    }
    return Array.from(set);
  }

  async update(id: string, input: UpdateVaultItemInput): Promise<VaultItemDoc | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updatedAt = new Date();
    const updatePayload: Record<string, unknown> = { updatedAt };
    if (input.title !== undefined) updatePayload["title"] = input.title;
    if (input.username !== undefined) updatePayload["username"] = input.username;
    if (input.password !== undefined) {
      updatePayload["password"] = input.password;
      updatePayload["passwordChangedAt"] = updatedAt;
    }
    if (input.url !== undefined) updatePayload["url"] = input.url;
    if (input.category !== undefined) updatePayload["category"] = input.category;
    if (input.notes !== undefined) updatePayload["notes"] = input.notes;
    if (input.tags !== undefined) {
      updatePayload["tags"] =
        typeof input.tags === "string"
          ? input.tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : Array.isArray(input.tags)
            ? input.tags
            : [];
    }

    await this.col.updateOne({ id }, { $set: updatePayload });
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    await this.col.deleteOne({ id });
    return true;
  }
}
