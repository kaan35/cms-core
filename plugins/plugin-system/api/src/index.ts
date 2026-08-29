import type { CoreServices } from "@cms/core";
import type { FastifyInstance } from "fastify";
import { AuditLogRepository } from "./repositories/auditLogRepository.js";
import { FeatureFlagsRepository } from "./repositories/featureFlagsRepository.js";
import { PluginsRepository } from "./repositories/pluginsRepository.js";
import { registerSystemRoutes } from "./routes.js";
import { SystemController } from "./systemController.js";
import { SystemService } from "./systemService.js";

export {
  FEATURE_FLAG_KEY_REGEX,
  HEX_COLOR_REGEX,
  SYSTEM_PERMISSIONS,
  validateFeatureFlagKey,
  validateHexColor,
  validateTheme,
} from "./domain/system.rules.js";
export type { SiteTheme, NavigationMenuItem } from "./domain/system.rules.js";
export { initSystemMigration } from "./migrations/202601020000_init_system.js";
export { AuditLogRepository } from "./repositories/auditLogRepository.js";
export type { AuditLogDoc } from "./repositories/auditLogRepository.js";
export { FeatureFlagsRepository } from "./repositories/featureFlagsRepository.js";
export type { FeatureFlagDoc } from "./repositories/featureFlagsRepository.js";
export { PluginsRepository } from "./repositories/pluginsRepository.js";
export type { PluginDoc } from "./repositories/pluginsRepository.js";
export { registerSystemRoutes } from "./routes.js";
export { SystemController } from "./systemController.js";
export { SystemService } from "./systemService.js";

export async function registerSystemPlugin(
  app: FastifyInstance,
  services: CoreServices,
): Promise<void> {
  const { db, logger, hooks, settings } = services;

  const pluginsRepo = new PluginsRepository(db);
  const featureFlagsRepo = new FeatureFlagsRepository(db);
  const auditLogRepo = new AuditLogRepository(db);

  const systemService = new SystemService(
    pluginsRepo,
    featureFlagsRepo,
    auditLogRepo,
    settings,
    (app as unknown as { pluginLoader: import("@cms/core").PluginLoader }).pluginLoader,
    hooks,
    db,
    logger,
  );

  systemService.registerAuditHooks();

  const controller = new SystemController(systemService);

  registerSystemRoutes(app, controller);
}
