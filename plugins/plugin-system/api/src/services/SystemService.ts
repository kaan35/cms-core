import type { IDatabase, IHookManager, ILogger, ISettingsService, PluginLoader } from "@cms/core";
import { EVENTS, NotFoundError, buildPaginatedResult } from "@cms/core";
import type {
  AuditLogDoc,
  AuditLogRepository,
  AuditLogSearchContext,
} from "../repositories/auditLogRepository.js";
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

  async createFeatureFlag(input: unknown, actorId?: string): Promise<FeatureFlagDoc> {
    return this.featureFlagService.createFeatureFlag(input, actorId);
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

  private async buildAuditSearchContext(
    query: string,
    tz?: string,
  ): Promise<AuditLogSearchContext | undefined> {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;

    const matchedActorIds = new Set<string>();
    const matchedTokenIds = new Set<string>();

    try {
      const usersCol = this.db.collection<{ id: string; email: string; name?: string }>(
        "cms_users",
      );
      const users = await usersCol.find();
      for (const u of users) {
        if (
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.name && u.name.toLowerCase().includes(q))
        ) {
          if (u.id) matchedActorIds.add(u.id);
        }
      }
    } catch {
      // Inaccessible collection or test stub
    }

    try {
      const tokensCol = this.db.collection<{ id: string; name: string; tokenPrefix?: string }>(
        "cms_api_tokens",
      );
      const tokens = await tokensCol.find();
      for (const t of tokens) {
        if (
          (t.name && t.name.toLowerCase().includes(q)) ||
          (t.tokenPrefix && t.tokenPrefix.toLowerCase().includes(q))
        ) {
          if (t.id) {
            matchedTokenIds.add(t.id);
            matchedTokenIds.add(`api-token:${t.id}`);
          }
        }
      }
    } catch {
      // Inaccessible collection or test stub
    }

    return {
      matchedActorIds,
      matchedTokenIds,
      ...(tz ? { timeZone: tz } : {}),
    };
  }

  // Audit Logs
  async listAuditLogs(page = 1, limit = 50, search?: string, tz?: string) {
    const skip = (page - 1) * limit;
    const searchContext =
      search && search.trim() ? await this.buildAuditSearchContext(search, tz) : undefined;
    const [items, total] = await Promise.all([
      this.auditLogRepo.list(skip, limit, search, searchContext),
      this.auditLogRepo.count(search, searchContext),
    ]);

    const actorIds = [
      ...new Set(items.map((i) => i.actorId).filter((id): id is string => Boolean(id))),
    ];
    const userMap = new Map<string, string>();
    if (actorIds.length > 0) {
      try {
        const usersCol = this.db.collection<{ id: string; email: string }>("cms_users");
        const allUsers = await usersCol.find({ id: { $in: actorIds } });
        for (const u of allUsers) {
          if (u.id && u.email) {
            userMap.set(u.id, u.email);
          }
        }
      } catch {
        // Fallback gracefully if users collection is inaccessible
      }
    }

    const tokenIds = [
      ...new Set(
        items
          .map((i) => {
            const raw = i.tokenId || (i.data?.["tokenId"] as string | undefined);
            if (raw && raw.startsWith("api-token:")) {
              return raw.replace("api-token:", "");
            }
            return raw;
          })
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const tokenMap = new Map<string, { name: string; tokenPrefix?: string | undefined }>();
    if (tokenIds.length > 0) {
      try {
        const tokensCol = this.db.collection<{
          id: string;
          name: string;
          tokenPrefix?: string | undefined;
        }>("cms_api_tokens");
        const allTokens = await tokensCol.find({ id: { $in: tokenIds } });
        for (const t of allTokens) {
          if (t.id && t.name) {
            tokenMap.set(t.id, { name: t.name, tokenPrefix: t.tokenPrefix });
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    const enriched = items.map((item) => {
      const email = item.actorId ? userMap.get(item.actorId) : undefined;
      const rawTokenId = item.tokenId || (item.data?.["tokenId"] as string | undefined);
      const cleanTokenId = rawTokenId?.startsWith("api-token:")
        ? rawTokenId.replace("api-token:", "")
        : rawTokenId;
      const tokenInfo = cleanTokenId ? tokenMap.get(cleanTokenId) : undefined;
      const tokenName = (item.data?.["tokenName"] as string | undefined) || tokenInfo?.name;
      const tokenPrefix =
        (item.data?.["tokenPrefix"] as string | undefined) || tokenInfo?.tokenPrefix;

      return {
        ...item,
        ...(email ? { userEmail: email } : {}),
        ...(tokenName ? { tokenName } : {}),
        ...(tokenPrefix ? { tokenPrefix } : {}),
      };
    });

    return buildPaginatedResult(enriched, total, page, limit);
  }

  async recordAuditLog(entry: {
    event: string;
    actorId?: string | undefined;
    actorType?: "user" | "agent" | "system" | undefined;
    tokenId?: string | undefined;
    payload?: Record<string, unknown> | undefined;
    ip?: string | undefined;
  }): Promise<AuditLogDoc> {
    const doc = await this.auditLogRepo.create({
      event: entry.event,
      ...(entry.actorId ? { actorId: entry.actorId } : {}),
      ...(entry.actorType ? { actorType: entry.actorType } : {}),
      ...(entry.tokenId ? { tokenId: entry.tokenId } : {}),
      ...(entry.payload ? { data: entry.payload } : {}),
    });
    this.logger.info(`Audit: ${entry.event}`, {
      actorId: entry.actorId,
      actorType: entry.actorType,
    });
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
      EVENTS.VAULT.CREATED,
      EVENTS.VAULT.UPDATED,
      EVENTS.VAULT.DELETED,
      EVENTS.VAULT.REVEALED,
      EVENTS.MCP.TOOL_EXECUTED,
    ];

    for (const event of auditEvents) {
      this.hooks.on(event, async (payload: unknown) => {
        const p =
          payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
        const actorId = typeof p["actorId"] === "string" ? p["actorId"] : undefined;
        const actorType =
          p["actorType"] === "agent" || p["actorType"] === "user" || p["actorType"] === "system"
            ? p["actorType"]
            : undefined;
        const tokenId = typeof p["tokenId"] === "string" ? p["tokenId"] : undefined;

        await this.recordAuditLog({
          event,
          actorId,
          actorType,
          tokenId,
          payload: p,
        });
      });
    }
  }

  async getStats(): Promise<{
    status: "ok" | "degraded" | "error";
    db: boolean;
    pluginsCount: number;
    totalPlugins: number;
    pagesCount: number;
    postsCount: number;
    formsCount: number;
    usersCount: number;
    timestamp: Date;
  }> {
    const dbAlive = await this.db.isAlive().catch(() => false);
    const plugins = await this.pluginsRepo.list().catch(() => []);

    let pagesCount = 0;
    let postsCount = 0;
    let formsCount = 0;
    let usersCount = 0;

    try {
      const pagesCol = this.db.collection("cms_pages");
      pagesCount = await pagesCol.countDocuments({ status: "published" });
    } catch {
      // Fallback gracefully if collection is inaccessible
    }

    try {
      const postsCol = this.db.collection("cms_blog_posts");
      postsCount = await postsCol.countDocuments({ status: "published" });
    } catch {
      // Fallback gracefully if collection is inaccessible
    }

    try {
      const formsCol = this.db.collection("cms_forms");
      formsCount = await formsCol.countDocuments();
    } catch {
      // Fallback gracefully if collection is inaccessible
    }

    try {
      const usersCol = this.db.collection("cms_users");
      usersCount = await usersCol.countDocuments();
    } catch {
      // Fallback gracefully if collection is inaccessible
    }

    return {
      status: dbAlive ? "ok" : "error",
      db: dbAlive,
      pluginsCount: plugins.filter((p) => p.enabled).length,
      totalPlugins: plugins.length,
      pagesCount,
      postsCount,
      formsCount,
      usersCount,
      timestamp: new Date(),
    };
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
