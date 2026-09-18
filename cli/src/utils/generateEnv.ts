import crypto from "node:crypto";
import type { PluginProfile } from "./pinnedVersions.js";

export interface GenerateEnvOptions {
  projectName: string;
  cmsTag?: string | undefined;
  autoUpdate?: boolean | undefined;
  nodeEnv?: "production" | "development" | undefined;
  apiPort?: number | undefined;
  adminPort?: number | undefined;
  clientPort?: number | undefined;
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
  const cmsTag = options.cmsTag ?? "latest";
  const isDev = options.nodeEnv === "development";
  const nodeEnv = isDev ? "development" : "production";
  const logLevel = isDev ? "debug" : "info";
  const restartPolicy = isDev ? "no" : "unless-stopped";
  const clientTarget = isDev ? "dev" : "runner";
  const autoUpdate = isDev ? false : options.autoUpdate !== false;
  const apiPort = options.apiPort ?? 3001;
  const adminPort = options.adminPort ?? 3002;
  const clientPort = options.clientPort ?? 3000;
  const pluginsProfile = options.pluginsProfile ?? "full";
  const dbName =
    options.mongoDbName ?? options.projectName.toLowerCase().replace(/[^a-z0-9_]/g, "_");

  const origins: string[] = [];
  if (options.includeClient !== false) origins.push(`http://localhost:${clientPort}`);
  if (options.includeAdmin !== false) origins.push(`http://localhost:${adminPort}`);

  return `# ==============================================================================
# CMS Project Environment Configuration
# Project: ${options.projectName}
# Generated: ${new Date().toISOString()}
# ==============================================================================

# Project Identity
PROJECT_NAME=${options.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}

# Core Image Version Tag & Auto-Update Policy
CMS_TAG=${cmsTag}
AUTO_UPDATE=${autoUpdate ? "true" : "false"}
PLUGINS_PROFILE=${pluginsProfile}

# Environment Mode (production | development)
NODE_ENV=${nodeEnv}
LOG_LEVEL=${logLevel}
RESTART_POLICY=${restartPolicy}
CLIENT_TARGET=${clientTarget}

# Cryptographic Keys & Session Security
JWT_SECRET=${jwtSecret}
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
REDIS_URL=redis://redis:6379

# Network & Origins
CORS_ALLOWED_ORIGINS=${origins.join(",")}
API_URL=http://api:3001
HOST=0.0.0.0
`;
}
