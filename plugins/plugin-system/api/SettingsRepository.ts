import type { IDatabase, ILogger } from "@cms/core";
import type { Collection, Document } from "mongodb";
import { COLLECTIONS } from "./constants.ts";

export interface SystemSettings extends Document {
  _id?: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  updatedAt?: Date;
}

export class SettingsRepository {
  private readonly db: IDatabase;
  private readonly logger: ILogger;
  private readonly settingsCollection: Collection<SystemSettings>;

  constructor(db: IDatabase, logger: ILogger) {
    this.db = db;
    this.logger = logger;
    this.settingsCollection = this.db.getCollection<SystemSettings>(COLLECTIONS.SETTINGS);
  }

  async get(): Promise<SystemSettings> {
    const settings = await this.settingsCollection.findOne({});
    if (!settings) {
      return {
        brandName: "ModularCMS",
        primaryColor: "#8b5cf6",
        secondaryColor: "#4f46e5",
      } as SystemSettings;
    }
    return settings;
  }

  async update(settings: Omit<SystemSettings, "_id">): Promise<void> {
    await this.settingsCollection.updateOne(
      {},
      {
        $set: {
          brandName: settings.brandName,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          updatedAt: new Date(),
        },
      } as any,
      { upsert: true },
    );
  }
}
