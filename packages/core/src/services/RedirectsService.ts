import type { IDatabase } from "../types/IDatabase.js";
import type { ILogger } from "../types/ILogger.js";
import type { IRedirectsService, RedirectDoc } from "../types/services.js";

export class RedirectsService implements IRedirectsService {
  private readonly logger: ILogger;
  private readonly collection;

  constructor(db: IDatabase, logger: ILogger) {
    this.logger = logger;
    this.collection = db.collection<RedirectDoc>("cms_redirects");
  }

  async findByFrom(from: string): Promise<RedirectDoc | null> {
    return this.collection.findOne({ from });
  }

  async create(from: string, to: string): Promise<void> {
    await this.collection.insertOne({ from, to, createdAt: new Date() });
    this.logger.info("Redirect created", { from, to });
  }

  async delete(from: string): Promise<void> {
    await this.collection.deleteOne({ from });
    this.logger.info("Redirect deleted", { from });
  }

  async list(): Promise<RedirectDoc[]> {
    return this.collection.find();
  }
}
