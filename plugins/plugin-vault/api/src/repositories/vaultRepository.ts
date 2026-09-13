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
    const doc: VaultItemDoc = {
      id: randomUUID(),
      title: input.title,
      username: input.username ?? "",
      password: input.password,
      url: input.url ?? "",
      category: input.category ?? "General",
      notes: input.notes ?? "",
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    await this.col.insertOne(doc);
    return doc;
  }

  async findById(id: string): Promise<VaultItemDoc | null> {
    return this.col.findOne({ id });
  }

  async list(filterCategory?: string, search?: string): Promise<VaultItemDoc[]> {
    const filter: Record<string, unknown> = {};
    if (filterCategory && filterCategory !== "all") {
      filter["category"] = filterCategory;
    }
    const all = await this.col.find(filter, { sort: { createdAt: -1 } });
    if (!search || search.trim() === "") {
      return all;
    }
    const q = search.toLowerCase();
    return all.filter(
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
    if (input.password !== undefined) updatePayload["password"] = input.password;
    if (input.url !== undefined) updatePayload["url"] = input.url;
    if (input.category !== undefined) updatePayload["category"] = input.category;
    if (input.notes !== undefined) updatePayload["notes"] = input.notes;
    if (input.tags !== undefined) updatePayload["tags"] = input.tags;

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
