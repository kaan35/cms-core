import type { ICollection, IDatabase } from "@cms/core";

export interface PluginDoc extends Record<string, unknown> {
  name: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export class PluginsRepository {
  private readonly collection: ICollection<PluginDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<PluginDoc>("cms_plugins");
  }

  async list(): Promise<PluginDoc[]> {
    return this.collection.find();
  }

  async findByName(name: string): Promise<PluginDoc | null> {
    return this.collection.findOne({ name });
  }

  async setEnabled(name: string, enabled: boolean): Promise<PluginDoc | null> {
    const updatedAt = new Date();
    await this.collection.updateOne({ name }, { $set: { enabled, updatedAt } });
    return this.collection.findOne({ name });
  }
}
