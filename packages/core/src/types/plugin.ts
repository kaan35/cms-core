import type { FastifyInstance } from "fastify";
import type { ICache } from "./ICache.js";
import type { IDatabase } from "./IDatabase.js";
import type { ILogger } from "./ILogger.js";
import type {
  IConfigService,
  IHookManager,
  IRedirectsService,
  ISettingsService,
} from "./services.js";

export interface CoreServices {
  config: IConfigService;
  logger: ILogger;
  db: IDatabase;
  cache: ICache;
  hooks: IHookManager;
  redirects: IRedirectsService;
  settings: ISettingsService;
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
