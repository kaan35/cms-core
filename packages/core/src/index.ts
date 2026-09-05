// Types
export type { AuthUser } from "./types/auth.js";
export type {} from "./types/fastify.js";
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
export type {
  HookHandler,
  IConfigService,
  IHookManager,
  IRedirectsService,
  ISettingsService,
  RedirectDoc,
} from "./types/services.js";

// Errors
export {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors/AppError.js";

// Validation, Pagination & Slugs
export {
  assertUniqueSlug,
  generateSlug,
  resolveUpdatedSlug,
  searchPaginated,
} from "./slugUtils.js";
export { decorateTestAuth } from "./testUtils.js";
export { buildPaginatedResult, parsePaginationQuery } from "./utils/pagination.js";
export type { PaginatedResult } from "./utils/pagination.js";
export { validateWithSchema } from "./utils/validation.js";

// Registries
export { DECORATOR_KEYS } from "./decoratorKeys.js";
export { EVENTS } from "./events.js";
export type { EventKey } from "./events.js";
export { PERMISSIONS } from "./permissions.js";
export type { PermissionKey } from "./permissions.js";

// Services
export { ConfigService } from "./services/ConfigService.js";
export { HookManager } from "./services/HookManager.js";
export { LogService, stubLogger } from "./services/LogService.js";
export type { LogLevel } from "./services/LogService.js";
export { PluginLoader } from "./services/PluginLoader.js";
export { RedirectsService } from "./services/RedirectsService.js";
export { RedisCacheService } from "./services/RedisCacheService.js";
export { SettingsService } from "./services/SettingsService.js";

// Plugin manifest
export { PLUGIN_MANIFEST } from "./pluginManifest.js";

// Migrations
export { coreMigrations, runMigrations } from "./migrations/index.js";

// Composition root
export { createServer } from "./createServer.js";
