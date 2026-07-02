/// <reference path="./types/fastify.d.ts" />

// Config & Logging
export { config } from "./ConfigService.ts";
export type { Config } from "./ConfigService.ts";
export { logger } from "./LogService.ts";

// Database Singleton
export { database } from "@cms/db";

// Event System
export { HookManager, hooks } from "./HookManager.ts";

// Data & Cache
export { cache, RedisCacheService } from "./RedisCacheService.ts";

// Plugin System
export { PluginLoader, pluginLoader } from "./PluginLoader.ts";

// Core Services
export { AuditLogService } from "./AuditLogService.ts";
export { BackupService } from "./BackupService.ts";
export { WebhookService } from "./WebhookService.ts";

// Middleware
export { createPluginGuard } from "./middleware/pluginGuard.ts";

// Utilities
export { parseObjectId, serializeDocument, serializeDocuments } from "./utils/objectId.ts";
export {
  buildPaginationMeta, parsePaginationQuery
} from "./utils/pagination.ts";
export type { PaginationMeta, PaginationParams, PaginationQuery } from "./utils/pagination.ts";

// Types
export type { ICache } from "./types/ICache.ts";
export type { IDatabase } from "./types/IDatabase.ts";
export type { ILogger } from "./types/ILogger.ts";
export type { CmsPlugin } from "./types/plugin.ts";
