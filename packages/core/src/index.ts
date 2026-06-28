// Config & Logging
export { config } from "./ConfigService.ts";
export type { Config } from "./ConfigService.ts";
export { logger } from "./LogService.ts";

// Database Singleton
export { database } from "@cms/db";

// Event System
export { HookManager, hooks } from "./HookManager.ts";

// Data & Cache
export { RedisCacheService, cache } from "./RedisCacheService.ts";

// Plugin System
export { PluginLoader, pluginLoader } from "./PluginLoader.ts";

// Core Services
export { AuditLogService } from "./AuditLogService.ts";
export { WebhookService } from "./WebhookService.ts";
export { BackupService } from "./BackupService.ts";

// Middleware
export { createPluginGuard } from "./middleware/pluginGuard.ts";

// Utilities
export { parseObjectId, serializeDocument, serializeDocuments } from "./utils/objectId.ts";
export {
  parsePaginationQuery,
  buildPaginationMeta,
} from "./utils/pagination.ts";
export type { PaginationQuery, PaginationParams, PaginationMeta } from "./utils/pagination.ts";

// Types
export type { CmsPlugin } from "./types/plugin.ts";
