// Types
export type { ICache } from "./types/ICache.js";
export type {
  CreateIndexOptions,
  FindOptions,
  ICollection,
  IDatabase,
  UpdateOptions,
} from "./types/IDatabase.js";
export type { ILogger } from "./types/ILogger.js";
export type { CoreServices, Migration, PluginManifestEntry } from "./types/plugin.js";

// Errors
export {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors/AppError.js";

// Pagination
export { buildPaginatedResult, parsePaginationQuery } from "./pagination.js";
export type { PaginatedResult } from "./pagination.js";

// Registries
export { DECORATOR_KEYS } from "./decoratorKeys.js";
export { EVENTS } from "./events.js";
export { PERMISSIONS } from "./permissions.js";

// Services
export { ConfigService } from "./ConfigService.js";
export { HookManager } from "./HookManager.js";
export { LogService } from "./LogService.js";
export type { LogLevel } from "./LogService.js";
export { PluginLoader } from "./PluginLoader.js";
export { RedirectsService } from "./RedirectsService.js";
export { RedisCacheService } from "./RedisCacheService.js";
export { SettingsService } from "./SettingsService.js";

// Plugin manifest
export { PLUGIN_MANIFEST } from "./pluginManifest.js";

// Migrations
export { coreMigrations, runMigrations } from "./migrations/index.js";

// Composition root
export { createServer } from "./createServer.js";
