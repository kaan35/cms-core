import type { ICollection, IDatabase } from "@cms/core";

export interface FeatureFlagDoc extends Record<string, unknown> {
  key: string;
  label: string;
  description?: string;
  value: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FeatureFlagsRepository {
  private readonly collection: ICollection<FeatureFlagDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<FeatureFlagDoc>("cms_feature_flags");
  }

  async list(): Promise<FeatureFlagDoc[]> {
    return this.collection.find();
  }

  async findByKey(key: string): Promise<FeatureFlagDoc | null> {
    return this.collection.findOne({ key });
  }

  async create(data: {
    key: string;
    label: string;
    description?: string;
    value: boolean;
  }): Promise<FeatureFlagDoc> {
    const now = new Date();
    const doc: FeatureFlagDoc = {
      key: data.key,
      label: data.label,
      ...(data.description ? { description: data.description } : {}),
      value: data.value,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async update(
    key: string,
    patch: { label?: string; description?: string; value?: boolean },
  ): Promise<FeatureFlagDoc | null> {
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.label !== undefined) updatePayload["label"] = patch.label;
    if (patch.description !== undefined) updatePayload["description"] = patch.description;
    if (patch.value !== undefined) updatePayload["value"] = patch.value;

    await this.collection.updateOne({ key }, { $set: updatePayload });
    return this.collection.findOne({ key });
  }

  async delete(key: string): Promise<boolean> {
    const existing = await this.collection.findOne({ key });
    if (!existing) return false;
    await this.collection.deleteOne({ key });
    return true;
  }
}
