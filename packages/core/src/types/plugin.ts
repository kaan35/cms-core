import type { FastifyInstance } from "fastify";
import type { ICache } from "./ICache.js";
import type { IDatabase } from "./IDatabase.js";
import type { ILogger } from "./ILogger.js";

type AnyService = any;

export interface CoreServices {
  config: AnyService; // ConfigService
  logger: ILogger;
  db: IDatabase;
  cache: ICache;
  hooks: AnyService; // HookManager
  redirects: AnyService; // RedirectsService
  settings: AnyService; // SettingsService
}

export interface Migration {
  id: string;
  up: (db: IDatabase) => Promise<void>;
}

export interface PluginManifestEntry {
  name: string;
  priority: number;
  migrations?: Migration[];
  register: (app: FastifyInstance, services: CoreServices) => Promise<void>;
}
