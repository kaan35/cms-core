import type { IDatabase, ILogger } from "@cms/core";
import { parseObjectId } from "@cms/core";
import type { Collection, Document } from "mongodb";
import { COLLECTIONS } from "./constants.ts";

export interface SystemPlugin extends Document {
  _id?: string;
  name: string;
  displayName?: string;
  version?: string;
  description?: string;
  isEnabled: boolean;
  config?: Record<string, any>;
}

export class PluginsRepository {
  private readonly db: IDatabase;
  private readonly logger: ILogger;
  private readonly pluginsCollection: Collection<SystemPlugin>;

  constructor(db: IDatabase, logger: ILogger) {
    this.db = db;
    this.logger = logger;
    this.pluginsCollection = this.db.getCollection<SystemPlugin>(COLLECTIONS.PLUGINS);
  }

  async findAll(): Promise<SystemPlugin[]> {
    return this.pluginsCollection.find({}).sort({ name: 1 }).toArray();
  }

  async findById(id: string): Promise<SystemPlugin | null> {
    try {
      const objectId = parseObjectId(id);
      return await this.pluginsCollection.findOne({ _id: objectId } as any);
    } catch {
      return null;
    }
  }

  async findByName(name: string): Promise<SystemPlugin | null> {
    return this.pluginsCollection.findOne({ name } as any);
  }

  async toggleEnabled(id: string): Promise<{ success: boolean; isEnabled: boolean } | null> {
    const plugin = await this.findById(id);
    if (!plugin) return null;

    const objectId = parseObjectId(id);
    const newStatus = !plugin.isEnabled;
    const result = await this.pluginsCollection.updateOne(
      { _id: objectId } as any,
      { $set: { isEnabled: newStatus } } as any,
    );

    return {
      success: result.modifiedCount > 0,
      isEnabled: newStatus,
    };
  }

  async updateConfig(id: string, config: Record<string, any>): Promise<boolean> {
    const objectId = parseObjectId(id);
    const result = await this.pluginsCollection.updateOne(
      { _id: objectId } as any,
      { $set: { config } } as any,
    );
    return result.modifiedCount > 0;
  }
}
