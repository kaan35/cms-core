import type { IDatabase } from "./types/IDatabase.js";
import type { ILogger } from "./types/ILogger.js";

interface SettingDoc extends Record<string, unknown> {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export class SettingsService {
  private readonly collection;

  constructor(
    private readonly db: IDatabase,
    private readonly logger: ILogger,
  ) {
    this.collection = db.collection<SettingDoc>("cms_settings");
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    const doc = await this.collection.findOne({ key });
    if (doc === null) return defaultValue;
    return doc.value as T;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.collection.updateOne(
      { key },
      { $set: { key, value, updatedAt: new Date() } },
      { upsert: true },
    );
    this.logger.debug("Setting updated", { key });
  }
}
