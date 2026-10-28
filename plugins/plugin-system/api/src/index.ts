import type { CoreServices } from "@cms/core";
import type { FastifyInstance } from "fastify";
import { AuditLogRepository } from "./repositories/auditLogRepository.js";
import { PluginsRepository } from "./repositories/pluginsRepository.js";
import { registerSystemRoutes } from "./routes.js";
import { BrandSettingsService } from "./services/BrandSettingsService.js";
import { SystemController } from "./systemController.js";
import { SystemService } from "./systemService.js";

export {
  HEX_COLOR_REGEX,
  NavigationMenuItemSchema,
  SYSTEM_PERMISSIONS,
  TogglePluginSchema,
  UpdateSettingsSchema,
  validateHexColor,
  validateTheme,
  validateTogglePlugin,
  validateUpdateSettings,
} from "./domain/system.rules.js";
export type {
  NavigationMenuItem,
  SettingsDoc,
  SiteTheme,
  SystemSettingsDoc,
  TogglePluginInput,
  UpdateSettingsInput,
} from "./domain/system.rules.js";
export { initSystemMigration } from "./migrations/202601020000_init_system.js";
export { AuditLogRepository } from "./repositories/auditLogRepository.js";
export type { AuditLogDoc } from "./repositories/auditLogRepository.js";
export { PluginsRepository } from "./repositories/pluginsRepository.js";
export type { PluginDoc } from "./repositories/pluginsRepository.js";
export { registerSystemRoutes } from "./routes.js";
export { BrandSettingsService } from "./services/BrandSettingsService.js";
export { SystemController } from "./systemController.js";
export { SystemService } from "./systemService.js";

export async function registerSystemPlugin(
  app: FastifyInstance,
  services: CoreServices,
): Promise<void> {
  const { db, logger, hooks, settings } = services;

  const pluginsRepo = new PluginsRepository(db);
  const auditLogRepo = new AuditLogRepository(db);

  const brandSettingsService = new BrandSettingsService(settings, hooks, logger);

  const systemService = new SystemService(
    pluginsRepo,
    auditLogRepo,
    settings,
    (app as unknown as { pluginLoader: import("@cms/core").PluginLoader }).pluginLoader,
    hooks,
    db,
    logger,
    brandSettingsService,
  );

  systemService.registerAuditHooks();

  const controller = new SystemController(systemService);

  registerSystemRoutes(app, controller);
}
