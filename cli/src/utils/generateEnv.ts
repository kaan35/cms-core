import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CMS_REGISTRY, type PluginProfile } from "./pinnedVersions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CMS_CORE_PATH = path.resolve(__dirname, "../../..");

export interface GenerateEnvOptions {
  projectName: string;
  cmsRegistry?: string | undefined;
  cmsTag?: string | undefined;
  cmsCorePath?: string | undefined;
  autoUpdate?: boolean | undefined;
  nodeEnv?: "production" | "development" | undefined;
  apiPort?: number | undefined;
  adminPort?: number | undefined;
  clientPort?: number | undefined;
  mongoPort?: number | undefined;
  redisPort?: number | undefined;
  mongoDbName?: string | undefined;
  pluginsProfile?: PluginProfile | undefined;
  includeAdmin?: boolean | undefined;
  includeClient?: boolean | undefined;
}

export function generateJwtSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateEnvContent(options: GenerateEnvOptions): string {
  const jwtSecret = generateJwtSecret();
  const vaultSecret = generateJwtSecret();
  const cmsRegistry = options.cmsRegistry ?? DEFAULT_CMS_REGISTRY;
  const cmsTag = options.cmsTag ?? "latest";
  const cmsCorePath = options.cmsCorePath ?? DEFAULT_CMS_CORE_PATH;
  const isDev = options.nodeEnv === "development";
  const nodeEnv = isDev ? "development" : "production";
  const logLevel = isDev ? "debug" : "info";
  const restartPolicy = isDev ? "no" : "unless-stopped";
  const clientTarget = isDev ? "dev" : "runner";
  const autoUpdate = isDev ? false : options.autoUpdate !== false;
  const apiPort = options.apiPort ?? 3001;
  const adminPort = options.adminPort ?? 3002;
  const clientPort = options.clientPort ?? 3000;
  const mongoPort = options.mongoPort ?? 27017;
  const redisPort = options.redisPort ?? 6379;
  const pluginsProfile = options.pluginsProfile ?? "full";
  const dbName =
    options.mongoDbName ?? options.projectName.toLowerCase().replace(/[^a-z0-9_]/g, "_");

  const normalizedProjectName =
    options.projectName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/^[^a-z0-9]+/, "") || "cms";

  const origins: string[] = [];
  if (options.includeClient !== false) origins.push(`http://localhost:${clientPort}`);
  if (options.includeAdmin !== false) origins.push(`http://localhost:${adminPort}`);

  return `# ==============================================================================
# CMS Project Environment Configuration
# Project: ${options.projectName}
# Generated: ${new Date().toISOString()}
# ==============================================================================

# Project Identity
PROJECT_NAME=${normalizedProjectName}

# Core Image Registry, Version Tag, Core Source Path & Auto-Update Policy
CMS_REGISTRY=${cmsRegistry}
CMS_TAG=${cmsTag}
CMS_CORE_PATH=${cmsCorePath}
AUTO_UPDATE=${autoUpdate ? "true" : "false"}

# Active Plugins: "full" (all), "minimal" (auth+system only), or comma-separated plugin names:
# Available plugins: pages, blog, forms, media, vault (auth & system are always enabled)
PLUGINS_PROFILE=${pluginsProfile}

# Environment Mode (production | development)
NODE_ENV=${nodeEnv}
LOG_LEVEL=${logLevel}
RESTART_POLICY=${restartPolicy}
CLIENT_TARGET=${clientTarget}

# Cryptographic Keys & Session Security
JWT_SECRET=${jwtSecret}
VAULT_SECRET=${vaultSecret}
SESSION_TTL_HOURS=168
COOKIE_SECURE=${isDev ? "false" : "true"}
COOKIE_PREFIX=${options.projectName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_
NEXT_PUBLIC_COOKIE_PREFIX=${options.projectName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_

# Service Ports
API_PORT=${apiPort}
${options.includeAdmin !== false ? `ADMIN_PORT=${adminPort}` : "# ADMIN_PORT disabled"}
${options.includeClient ? `CLIENT_PORT=${clientPort}` : "# CLIENT_PORT disabled"}

# Database & Cache
MONGO_URI=mongodb://mongo:27017
MONGO_DB_NAME=${dbName}
MONGO_PORT=${mongoPort}
REDIS_URL=redis://redis:6379
REDIS_PORT=${redisPort}

# Network & Origins
CORS_ALLOWED_ORIGINS=${origins.join(",")}
API_URL=http://api:3001
HOST=0.0.0.0
`;
}
