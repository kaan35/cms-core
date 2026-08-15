import type { FastifyInstance } from "fastify";
import type { ConfigService } from "../services/ConfigService.js";
import type { HookManager } from "../services/HookManager.js";
import type { RedirectsService } from "../services/RedirectsService.js";
import type { SettingsService } from "../services/SettingsService.js";
import type { ICache } from "./ICache.js";
import type { IDatabase } from "./IDatabase.js";
import type { ILogger } from "./ILogger.js";

export interface CoreServices {
  config: ConfigService;
  logger: ILogger;
  db: IDatabase;
  cache: ICache;
  hooks: HookManager;
  redirects: RedirectsService;
  settings: SettingsService;
}

export interface Migration {
  id: string;
  description?: string;
  up: (db: IDatabase) => Promise<void>;
  down?: (db: IDatabase) => Promise<void>;
}

export interface PluginManifestEntry {
  name: string;
  priority: number;
  migrations?: Migration[];
  register: (app: FastifyInstance, services: CoreServices) => Promise<void>;
}
