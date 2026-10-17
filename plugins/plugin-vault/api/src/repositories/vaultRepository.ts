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
      await this.col.insertOne(doc);
      docs.push(doc);
    }
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
    const all = await this.col.find(filter, { sort: { createdAt: -1 } });
    const normalized = all.map((item) => this.normalizeDoc(item));
    if (!search || search.trim() === "") {
      return normalized;
    }
    const q = search.toLowerCase();
    return normalized.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
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
