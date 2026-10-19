import type { ICache } from "../types/ICache.js";
import type { IDatabase } from "../types/IDatabase.js";
import type { ILogger } from "../types/ILogger.js";
import type { IConfigService, ISettingsService } from "../types/services.js";

interface SettingDoc extends Record<string, unknown> {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export class SettingsService implements ISettingsService {
  private readonly logger: ILogger;
  private readonly collection;
  private readonly cache?: ICache | undefined;
  private readonly ttlSeconds: number;

  constructor(db: IDatabase, logger: ILogger, cache?: ICache, config?: IConfigService) {
    this.logger = logger;
    this.collection = db.collection<SettingDoc>("cms_settings");
    this.cache = cache;
    this.ttlSeconds = this.cache && config ? config.getInt("CACHE_SETTINGS_TTL_SECONDS") : 0;
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    if (!this.cache) {
      const doc = await this.collection.findOne({ key });
      return doc === null ? defaultValue : (doc.value as T);
    }

    return this.cache.getOrSet<T>(
      `setting:${key}`,
      async () => {
        const doc = await this.collection.findOne({ key });
        return doc === null ? defaultValue : (doc.value as T);
      },
      this.ttlSeconds,
    );
  }

  async getMany<T extends Record<string, unknown>>(defaults: T): Promise<T> {
    const keys = Object.keys(defaults);
    const result: Record<string, unknown> = { ...defaults };
    const missingKeys: string[] = [];

    if (this.cache) {
      const cachedValues = await Promise.all(keys.map((k) => this.cache!.getJson(`setting:${k}`)));
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]!;
        const cached = cachedValues[i];
        if (cached !== null && cached !== undefined) {
          result[k] = cached;
        } else {
          missingKeys.push(k);
        }
      }
    } else {
      missingKeys.push(...keys);
    }

    if (missingKeys.length > 0) {
      const docs = await this.collection.find({ key: { $in: missingKeys } });
      const foundMap = new Map(docs.map((d) => [d.key, d.value]));

      for (const k of missingKeys) {
        if (foundMap.has(k)) {
          const val = foundMap.get(k);
          result[k] = val;
          if (this.cache) {
            void this.cache.setJson(`setting:${k}`, val, this.ttlSeconds).catch(() => {});
          }
        } else {
          if (this.cache) {
            void this.cache.setJson(`setting:${k}`, defaults[k], this.ttlSeconds).catch(() => {});
          }
        }
      }
    }

    return result as T;
  }

  async set(key: string, value: unknown): Promise<void> {
    if (this.cache) {
      await this.cache.del(`setting:${key}`);
    }

    await this.collection.updateOne(
      { key },
      { $set: { key, value, updatedAt: new Date() } },
      { upsert: true },
    );
    this.logger.debug("Setting updated", { key });
  }
}
