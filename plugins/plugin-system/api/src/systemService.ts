import type { HookManager, IDatabase, ILogger, PluginLoader, SettingsService } from "@cms/core";
import { ConflictError, NotFoundError, ValidationError, buildPaginatedResult } from "@cms/core";
import { validateFeatureFlagKey, validateHexColor } from "./domain/system.rules.js";
import type { AuditLogDoc, AuditLogRepository } from "./repositories/auditLogRepository.js";
import type {
  FeatureFlagDoc,
  FeatureFlagsRepository,
} from "./repositories/featureFlagsRepository.js";
import type { PluginDoc, PluginsRepository } from "./repositories/pluginsRepository.js";

export class SystemService {
  private readonly pluginsRepo: PluginsRepository;
  private readonly featureFlagsRepo: FeatureFlagsRepository;
  private readonly auditLogRepo: AuditLogRepository;
  private readonly settingsService: SettingsService;
  private readonly pluginLoader: PluginLoader;
  private readonly hooks: HookManager;
  private readonly db: IDatabase;
  private readonly logger: ILogger;

  constructor(
    pluginsRepo: PluginsRepository,
    featureFlagsRepo: FeatureFlagsRepository,
    auditLogRepo: AuditLogRepository,
    settingsService: SettingsService,
    pluginLoader: PluginLoader,
    hooks: HookManager,
    db: IDatabase,
    logger: ILogger,
  ) {
    this.pluginsRepo = pluginsRepo;
    this.featureFlagsRepo = featureFlagsRepo;
    this.auditLogRepo = auditLogRepo;
    this.settingsService = settingsService;
    this.pluginLoader = pluginLoader;
    this.hooks = hooks;
    this.db = db;
    this.logger = logger;
  }

  // ---------------------------------------------------------------------------
  // Plugin Management
  // ---------------------------------------------------------------------------
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

    await this.hooks.emit("plugin.toggled", { name, enabled, actorId });
    this.logger.info(`Plugin '${name}' toggled`, { enabled, actorId });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Brand Settings
  // ---------------------------------------------------------------------------
  // System & Brand Settings
  // ---------------------------------------------------------------------------
  async getSettings(): Promise<{
    siteTitle: string;
    siteDescription: string;
    brandColor: string;
    brandFont: string;
    primaryColor: string;
    fontFamily: string;
    allowRegistration: boolean;
    sessionTimeoutMinutes: number;
  }> {
    const siteTitle = await this.settingsService.get<string>("system.site.title", "CMS Core");
    const siteDescription = await this.settingsService.get<string>(
      "system.site.description",
      "Headless CMS Engine",
    );
    const brandColor = await this.settingsService.get<string>("system.brand.color", "#3b82f6");
    const brandFont = await this.settingsService.get<string>("system.brand.font", "Inter");
    const allowRegistration = await this.settingsService.get<boolean>(
      "auth.registrationEnabled",
      true,
    );
    const sessionTimeoutMinutes = await this.settingsService.get<number>(
      "system.session.timeoutMinutes",
      60,
    );

    return {
      siteTitle,
      siteDescription,
      brandColor,
      brandFont,
      primaryColor: brandColor,
      fontFamily: brandFont,
      allowRegistration,
      sessionTimeoutMinutes,
    };
  }

  async updateSettings(
    patch: {
      siteTitle?: string | undefined;
      siteDescription?: string | undefined;
      brandColor?: string | undefined;
      brandFont?: string | undefined;
      primaryColor?: string | undefined;
      fontFamily?: string | undefined;
      allowRegistration?: boolean | undefined;
      sessionTimeoutMinutes?: number | undefined;
    },
    actorId?: string,
  ): Promise<{
    siteTitle: string;
    siteDescription: string;
    brandColor: string;
    brandFont: string;
    primaryColor: string;
    fontFamily: string;
    allowRegistration: boolean;
    sessionTimeoutMinutes: number;
  }> {
    if (patch.siteTitle !== undefined) {
      await this.settingsService.set("system.site.title", patch.siteTitle.trim());
    }

    if (patch.siteDescription !== undefined) {
      await this.settingsService.set("system.site.description", patch.siteDescription.trim());
    }

    const color = patch.brandColor ?? patch.primaryColor;
    if (color !== undefined) {
      if (!validateHexColor(color)) {
        throw new ValidationError("Invalid hex color format. Expected format: #fff or #ffffff");
      }
      await this.settingsService.set("system.brand.color", color.trim());
    }

    const font = patch.brandFont ?? patch.fontFamily;
    if (font !== undefined) {
      await this.settingsService.set("system.brand.font", font.trim());
    }

    if (patch.allowRegistration !== undefined) {
      await this.settingsService.set("auth.registrationEnabled", Boolean(patch.allowRegistration));
    }

    if (patch.sessionTimeoutMinutes !== undefined) {
      await this.settingsService.set(
        "system.session.timeoutMinutes",
        Number(patch.sessionTimeoutMinutes),
      );
    }

    const current = await this.getSettings();
    await this.hooks.emit("settings.updated", { ...current, actorId });
    this.logger.info("System settings updated", { ...current, actorId });

    return current;
  }

  // ---------------------------------------------------------------------------
  // Feature Flags (Public Read / Admin Write)
  // ---------------------------------------------------------------------------
  async listFeatureFlags(): Promise<FeatureFlagDoc[]> {
    return this.featureFlagsRepo.list();
  }

  async getFeatureFlag(key: string): Promise<FeatureFlagDoc> {
    const flag = await this.featureFlagsRepo.findByKey(key);
    if (!flag) {
      throw new NotFoundError(`Feature flag '${key}' not found`);
    }
    return flag;
  }

  async createFeatureFlag(
    data: { key: string; label: string; description?: string; value: boolean },
    actorId?: string,
  ): Promise<FeatureFlagDoc> {
    const key = data.key.trim();
    if (!validateFeatureFlagKey(key)) {
      throw new ValidationError(
        "Invalid feature flag key format. Use alphanumeric, underscore, dot, or hyphen (2-64 characters).",
      );
    }

    const label = data.label.trim();
    if (!label) {
      throw new ValidationError("Feature flag label is required");
    }

    const existing = await this.featureFlagsRepo.findByKey(key);
    if (existing) {
      throw new ConflictError(`Feature flag with key '${key}' already exists`);
    }

    const flag = await this.featureFlagsRepo.create({
      key,
      label,
      value: data.value,
      ...(data.description ? { description: data.description.trim() } : {}),
    });

    await this.hooks.emit("feature-flag.updated", {
      key,
      value: flag.value,
      action: "created",
      actorId,
    });
    this.logger.info(`Feature flag '${key}' created`, { value: flag.value, actorId });

    return flag;
  }

  async updateFeatureFlag(
    key: string,
    patch: { label?: string; description?: string; value?: boolean },
    actorId?: string,
  ): Promise<FeatureFlagDoc> {
    const existing = await this.featureFlagsRepo.findByKey(key);
    if (!existing) {
      throw new NotFoundError(`Feature flag '${key}' not found`);
    }

    const updated = await this.featureFlagsRepo.update(key, patch);
    if (!updated) {
      throw new NotFoundError(`Feature flag '${key}' not found`);
    }

    await this.hooks.emit("feature-flag.updated", {
      key,
      value: updated.value,
      action: "updated",
      actorId,
    });
    this.logger.info(`Feature flag '${key}' updated`, { value: updated.value, actorId });

    return updated;
  }

  async deleteFeatureFlag(key: string, actorId?: string): Promise<void> {
    const deleted = await this.featureFlagsRepo.delete(key);
    if (!deleted) {
      throw new NotFoundError(`Feature flag '${key}' not found`);
    }

    await this.hooks.emit("feature-flag.updated", { key, action: "deleted", actorId });
    this.logger.info(`Feature flag '${key}' deleted`, { actorId });
  }

  // ---------------------------------------------------------------------------
  // Audit Log (Read-Only)
  // ---------------------------------------------------------------------------
  async listAuditLogs(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      this.auditLogRepo.list(skip, limit),
      this.auditLogRepo.count(),
    ]);

    return buildPaginatedResult(entries, total, page, limit);
  }

  async recordAuditEntry(
    event: string,
    actorId?: string,
    data?: Record<string, unknown>,
  ): Promise<AuditLogDoc> {
    return this.auditLogRepo.create({
      event,
      ...(actorId ? { actorId } : {}),
      ...(data ? { data } : {}),
    });
  }

  registerAuditHooks(): void {
    const autoLogEvents = [
      "user.created",
      "plugin.toggled",
      "settings.updated",
      "feature-flag.updated",
    ];

    for (const eventName of autoLogEvents) {
      this.hooks.on(eventName, async (payload: unknown) => {
        try {
          const payloadObj =
            payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
          const actorId =
            typeof payloadObj["actorId"] === "string" ? payloadObj["actorId"] : undefined;
          await this.recordAuditEntry(eventName, actorId, payloadObj);
        } catch (err) {
          this.logger.error(`Failed to record audit log for event '${eventName}'`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // System Stats
  // ---------------------------------------------------------------------------
  async getStats(): Promise<{
    pagesCount: number;
    postsCount: number;
    formsCount: number;
    usersCount: number;
    pluginsCount: number;
    totalPlugins: number;
  }> {
    const [pagesCount, postsCount, formsCount, usersCount, plugins] = await Promise.all([
      this.db
        .collection("cms_pages")
        .countDocuments()
        .catch(() => 0),
      this.db
        .collection("cms_posts")
        .countDocuments()
        .catch(() => 0),
      this.db
        .collection("cms_forms")
        .countDocuments()
        .catch(() => 0),
      this.db
        .collection("cms_users")
        .countDocuments()
        .catch(() => 0),
      this.listPlugins().catch(() => []),
    ]);

    return {
      pagesCount,
      postsCount,
      formsCount,
      usersCount,
      pluginsCount: plugins.filter((p) => p.enabled).length,
      totalPlugins: plugins.length,
    };
  }
}
