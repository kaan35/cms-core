import type { IDatabase, IHookManager, ILogger, ISettingsService, PluginLoader } from "@cms/core";
import { EVENTS, NotFoundError, buildPaginatedResult } from "@cms/core";
import type { AuditLogDoc, AuditLogRepository } from "../repositories/auditLogRepository.js";
import type {
  FeatureFlagDoc,
  FeatureFlagsRepository,
} from "../repositories/featureFlagsRepository.js";
import type { PluginDoc, PluginsRepository } from "../repositories/pluginsRepository.js";
import { BrandSettingsService } from "./BrandSettingsService.js";
import { FeatureFlagService } from "./FeatureFlagService.js";

export class SystemService {
  private readonly pluginsRepo: PluginsRepository;
  private readonly auditLogRepo: AuditLogRepository;
  private readonly pluginLoader: PluginLoader;
  private readonly hooks: IHookManager;
  private readonly db: IDatabase;
  private readonly logger: ILogger;
  private readonly brandSettingsService: BrandSettingsService;
  private readonly featureFlagService: FeatureFlagService;

  constructor(
    pluginsRepo: PluginsRepository,
    featureFlagsRepo: FeatureFlagsRepository,
    auditLogRepo: AuditLogRepository,
    settingsService: ISettingsService,
    pluginLoader: PluginLoader,
    hooks: IHookManager,
    db: IDatabase,
    logger: ILogger,
    brandSettingsService?: BrandSettingsService,
    featureFlagService?: FeatureFlagService,
  ) {
    this.pluginsRepo = pluginsRepo;
    this.auditLogRepo = auditLogRepo;
    this.pluginLoader = pluginLoader;
    this.hooks = hooks;
    this.db = db;
    this.logger = logger;
    this.brandSettingsService =
      brandSettingsService ?? new BrandSettingsService(settingsService, hooks, logger);
    this.featureFlagService =
      featureFlagService ?? new FeatureFlagService(featureFlagsRepo, hooks, logger);
  }

  async listPlugins(): Promise<PluginDoc[]> {
    return this.pluginsRepo.list();
  }

  async togglePlugin(name: string, enabled: boolean, actorId?: string): Promise<PluginDoc> {
    const existing = await this.pluginsRepo.findByName(name);
    if (!existing) {
      throw new NotFoundError(`Plugin '${name}' not found`);
    }

    const updated = await this.pluginsRepo.setEnabled(name, enabled);
    if (!updated) {
      throw new NotFoundError(`Plugin '${name}' not found`);
    }

    // Refresh active plugins in PluginLoader
    await this.pluginLoader.reloadStates(this.db);

    await this.hooks.emit(EVENTS.SYSTEM.PLUGIN_TOGGLED, { name, enabled, actorId });
    this.logger.info(`Plugin '${name}' toggled`, { enabled, actorId });

    return updated;
  }

  // Brand Settings delegation
  async getSettings() {
    return this.brandSettingsService.getSettings();
  }

  async updateSettings(patch: unknown, actorId?: string) {
    return this.brandSettingsService.updateSettings(patch, actorId);
  }

  // Feature Flag delegation
  async listFeatureFlags() {
    return this.featureFlagService.listFeatureFlags();
  }

  async getFeatureFlag(key: string) {
    return this.featureFlagService.getFeatureFlag(key);
  }

  async createFeatureFlag(input: unknown, actorId?: string): Promise<FeatureFlagDoc>;
  async createFeatureFlag(
    key: string,
    value?: boolean,
    description?: string,
    actorId?: string,
  ): Promise<FeatureFlagDoc>;
  async createFeatureFlag(
    keyOrInput: string | unknown,
    valueOrActorId?: boolean | string,
    descriptionRaw?: string,
    actorIdRaw?: string,
  ): Promise<FeatureFlagDoc> {
    if (typeof keyOrInput === "string") {
      return this.featureFlagService.createFeatureFlag(
        {
          key: keyOrInput,
          value: typeof valueOrActorId === "boolean" ? valueOrActorId : false,
          description: descriptionRaw,
        },
        actorIdRaw,
      );
    }
    const actorId = typeof valueOrActorId === "string" ? valueOrActorId : actorIdRaw;
    return this.featureFlagService.createFeatureFlag(keyOrInput, actorId);
  }

  async updateFeatureFlag(key: string, patch: unknown, actorId?: string) {
    return this.featureFlagService.updateFeatureFlag(key, patch, actorId);
  }

  async deleteFeatureFlag(key: string, actorId?: string) {
    return this.featureFlagService.deleteFeatureFlag(key, actorId);
  }

  async evaluateFeatureFlag(key: string, defaultValue = false) {
    return this.featureFlagService.evaluateFeatureFlag(key, defaultValue);
  }

  // Audit Logs
  async listAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.auditLogRepo.list(skip, limit),
      this.auditLogRepo.count(),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async recordAuditLog(entry: {
    event: string;
    actorId?: string | undefined;
    payload?: Record<string, unknown> | undefined;
    ip?: string | undefined;
  }): Promise<AuditLogDoc> {
    const doc = await this.auditLogRepo.create({
      event: entry.event,
      ...(entry.actorId ? { actorId: entry.actorId } : {}),
      ...(entry.payload ? { data: entry.payload } : {}),
    });
    this.logger.info(`Audit: ${entry.event}`, { actorId: entry.actorId });
    return doc;
  }

  registerAuditHooks(): void {
    this.setupAuditListeners();
  }

  setupAuditListeners(): void {
    const auditEvents = [
      EVENTS.AUTH.USER_CREATED,
      EVENTS.AUTH.USER_UPDATED,
      EVENTS.AUTH.USER_DELETED,
      EVENTS.AUTH.ROLE_CREATED,
      EVENTS.AUTH.ROLE_UPDATED,
      EVENTS.AUTH.ROLE_DELETED,
      EVENTS.AUTH.SESSION_REVOKED,
      EVENTS.MEDIA.FILE_UPLOADED,
      EVENTS.MEDIA.FILE_DELETED,
      EVENTS.PAGE.CREATED,
      EVENTS.PAGE.UPDATED,
      EVENTS.PAGE.DELETED,
      EVENTS.BLOG.CREATED,
      EVENTS.BLOG.UPDATED,
      EVENTS.BLOG.DELETED,
      EVENTS.FORMS.CREATED,
      EVENTS.FORMS.UPDATED,
      EVENTS.FORMS.DELETED,
      EVENTS.FORMS.SUBMITTED,
      EVENTS.SYSTEM.PLUGIN_TOGGLED,
      EVENTS.SYSTEM.SETTINGS_UPDATED,
      EVENTS.SYSTEM.FEATURE_FLAG_CREATED,
      EVENTS.SYSTEM.FEATURE_FLAG_UPDATED,
      EVENTS.SYSTEM.FEATURE_FLAG_DELETED,
    ];

    for (const event of auditEvents) {
      this.hooks.on(event, async (payload: unknown) => {
        const actorId =
          payload && typeof payload === "object" && "actorId" in payload
            ? (payload as { actorId?: string }).actorId
            : undefined;
        await this.recordAuditLog({
          event,
          actorId,
          payload: (payload as Record<string, unknown>) ?? {},
        });
      });
    }
  }

  async getHealthStatus(): Promise<{
    status: "ok" | "degraded" | "error";
    db: boolean;
    pluginsCount: number;
    timestamp: Date;
  }> {
    const dbAlive = await this.db.isAlive();
    const plugins = await this.pluginsRepo.list();

    return {
      status: dbAlive ? "ok" : "error",
      db: dbAlive,
      pluginsCount: plugins.filter((p) => p.enabled).length,
      timestamp: new Date(),
    };
  }
}
