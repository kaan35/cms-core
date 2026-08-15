import type { FastifyInstance } from "fastify";
import { runMigrations } from "../migrations/runner.js";
import type { IDatabase } from "../types/IDatabase.js";
import type { ILogger } from "../types/ILogger.js";
import type { CoreServices, Migration, PluginManifestEntry } from "../types/plugin.js";

interface PluginRecord extends Record<string, unknown> {
  name: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export class PluginLoader {
  private readonly db: IDatabase;
  private readonly logger: ILogger;
  private readonly app: FastifyInstance;
  private readonly services: CoreServices;
  private enabledPlugins: Set<string> = new Set();

  constructor(db: IDatabase, logger: ILogger, app: FastifyInstance, services: CoreServices) {
    this.db = db;
    this.logger = logger;
    this.app = app;
    this.services = services;
  }

  async reloadStates(db?: IDatabase): Promise<void> {
    const targetDb = db ?? this.db;
    const pluginsCollection = targetDb.collection<PluginRecord>("cms_plugins");
    const records = await pluginsCollection.find();
    this.enabledPlugins = new Set(
      records.filter((r) => r.enabled !== false).map((r) => r.name),
    );
    this.logger.info("Plugin states reloaded", { enabled: Array.from(this.enabledPlugins) });
  }

  async loadAll(manifest: PluginManifestEntry[], coreMigrations: Migration[] = []): Promise<void> {
    const pluginsCollection = this.db.collection<PluginRecord>("cms_plugins");

    for (const entry of manifest) {
      const existing = await pluginsCollection.findOne({ name: entry.name });
      if (existing === null) {
        await pluginsCollection.insertOne({
          name: entry.name,
          enabled: true,
          createdAt: new Date(),
        });
        this.logger.info(`Plugin registered: ${entry.name}`);
      }
    }

    const pluginMigrations = manifest.flatMap((e) => e.migrations ?? []);
    const allMigrations: Migration[] = [...coreMigrations, ...pluginMigrations];
    await runMigrations(this.db, this.logger, allMigrations);

    await this.reloadStates();

    const sorted = [...manifest].sort((a, b) => a.priority - b.priority);

    for (const entry of sorted) {
      const capturedName = entry.name;
      await this.app.register(async (scope) => {
        scope.addHook("preHandler", async (_request, reply) => {
          if (!this.enabledPlugins.has(capturedName)) {
            return reply.status(503).send({ error: "Service temporarily unavailable" });
          }
        });

        await entry.register(scope, this.services);
        this.logger.info(`Plugin loaded: ${capturedName} (priority ${entry.priority})`);
      });
    }
  }
}
