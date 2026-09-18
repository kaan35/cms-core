import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyDirectory } from "./utils/copyDirectory.js";
import { generateComposeContent, generateDevComposeContent } from "./utils/generateCompose.js";
import { generateEnvContent } from "./utils/generateEnv.js";
import type { PluginProfile } from "./utils/pinnedVersions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolves template directory relative to cli package root
function getTemplatesDir(): string {
  return path.resolve(__dirname, "../templates");
}

function getClientTemplateDir(): string {
  return path.resolve(__dirname, "../../client-template");
}

export interface NewProjectOptions {
  projectName: string;
  targetDir?: string | undefined;
  cmsTag?: string | undefined;
  autoUpdate?: boolean | undefined;
  nodeEnv?: "production" | "development" | undefined;
  apiPort?: number | undefined;
  adminPort?: number | undefined;
  clientPort?: number | undefined;
  skipInstall?: boolean | undefined;
  includeAdmin?: boolean | undefined;
  includeClient?: boolean | undefined;
  pluginsProfile?: PluginProfile | undefined;
}

export interface NewProjectResult {
  projectDir: string;
  includeClient: boolean;
  services: string[];
  autoUpdate: boolean;
  nodeEnv: "production" | "development";
  ports: { api: number; admin?: number | undefined; client?: number | undefined };
}

export async function createNewProject(options: NewProjectOptions): Promise<NewProjectResult> {
  const baseDir =
    options.targetDir !== undefined ? path.resolve(options.targetDir) : path.resolve("projects");
  const projectDir = path.join(baseDir, options.projectName);
  const includeClient = options.includeClient ?? false;
  const includeAdmin = options.includeAdmin !== false;
  const autoUpdate = options.autoUpdate !== false;
  const apiPort = options.apiPort ?? 3001;
  const adminPort = options.adminPort ?? 3002;
  const clientPort = options.clientPort ?? 3000;

  // 1. Ensure target directory is clean
  try {
    const stat = await fs.stat(projectDir);
    if (stat.isDirectory()) {
      const files = await fs.readdir(projectDir);
      if (files.length > 0) {
        throw new Error(`Target directory "${projectDir}" exists and is not empty.`);
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("exists and is not empty")) {
      throw err;
    }
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "ENOENT"
    ) {
      // Safe: directory does not exist yet
    } else {
      throw err;
    }
  }

  await fs.mkdir(projectDir, { recursive: true });

  // 2. Write docker-compose.yml and docker-compose.dev.yml dynamically
  const composeContent = generateComposeContent({
    includeAdmin,
    includeClient,
  });
  await fs.writeFile(path.join(projectDir, "docker-compose.yml"), composeContent, "utf-8");

  const devComposeContent = generateDevComposeContent({
    includeAdmin,
  });
  await fs.writeFile(path.join(projectDir, "docker-compose.dev.yml"), devComposeContent, "utf-8");

  // 3. Write .env file
  const envContent = generateEnvContent({
    projectName: options.projectName,
    cmsTag: options.cmsTag,
    autoUpdate,
    nodeEnv: options.nodeEnv,
    apiPort,
    adminPort,
    clientPort,
    includeAdmin,
    includeClient,
    pluginsProfile: options.pluginsProfile,
  });
  await fs.writeFile(path.join(projectDir, ".env"), envContent, "utf-8");

  // 4. Setup scripts directory and auto-update.sh
  const scriptsDir = path.join(projectDir, "scripts");
  await fs.mkdir(scriptsDir, { recursive: true });
  const templatesDir = getTemplatesDir();
  const scriptSrc = path.join(templatesDir, "scripts/auto-update.sh");
  const scriptDest = path.join(scriptsDir, "auto-update.sh");
  await fs.copyFile(scriptSrc, scriptDest);
  await fs.chmod(scriptDest, 0o755);

  // 5. Setup logs directory
  await fs.mkdir(path.join(projectDir, "logs"), { recursive: true });

  // 6. Write root package.json for project developer scripts
  const scripts: Record<string, string> = {
    dev: includeClient
      ? "npm --prefix client run dev"
      : "docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f",
    prod: "docker compose -f docker-compose.yml up -d",
    pull: "docker compose pull",
    upgrade: "cms upgrade",
    "db:backup":
      "sh -c 'mkdir -p backups && TS=$(date +%Y%m%d-%H%M%S) && docker compose exec -T mongo mongodump --archive > backups/backup-$TS.archive && cp backups/backup-$TS.archive backups/backup-latest.archive && echo \"✅ Backup saved: backups/backup-$TS.archive (and backups/backup-latest.archive)\"'",
    "db:restore":
      "sh -c 'docker compose exec -T mongo mongorestore --archive < backups/backup-latest.archive && echo \"✅ Database restored from backups/backup-latest.archive\"'",
    "install:api": "docker compose exec api npm install || docker compose run --rm api npm install",
  };

  if (includeClient) {
    scripts["install:client"] = "npm --prefix client install";
    scripts["install:deps"] = "npm run install:api && npm run install:client";
  } else {
    scripts["install:deps"] = "npm run install:api";
  }

  const projectPkg = {
    name: options.projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts,
  };
  await fs.writeFile(
    path.join(projectDir, "package.json"),
    JSON.stringify(projectPkg, null, 2) + "\n",
    "utf-8",
  );

  // 7. If client included, copy client-template into client/
  const services = ["api"];
  if (includeAdmin) services.push("admin");
  services.push("mongo", "redis");
  if (includeClient) {
    const clientDest = path.join(projectDir, "client");
    const clientTemplateSrc = getClientTemplateDir();
    await copyDirectory(clientTemplateSrc, clientDest);
    services.push("client");
  }

  // 8. Write project README with Local Dev & Production Docker guides
  const isDev = options.nodeEnv === "development";
  const readmeContent = `# ${options.projectName}

Scaffolded with **CMS CLI** (Mode: \`${isDev ? "development" : "production"}\`).${includeClient ? " Includes Next.js web client." : ""}

## Development & Production Modes

This project can run in either **Local Development (Node Hot-Reload)** or **Production (Docker Container)** mode, controlled via \`.env\` (\`NODE_ENV\`).

### 1. Local Development Mode (Node & Hot Reload)
Run the client site with instant hot module reloading:
\`\`\`bash
npm run dev
\`\`\`
Connects to your local CMS Core API running at [http://localhost:${apiPort}](http://localhost:${apiPort}).

### 2. Production Server Mode (Docker)
Run all containerized services via Docker Compose:
\`\`\`bash
npm run docker:up
# Or: docker compose up -d
\`\`\`

## Service Endpoints
- **REST API:** [http://localhost:${apiPort}](http://localhost:${apiPort})
${includeAdmin ? `- **Admin Panel:** [http://localhost:${adminPort}](http://localhost:${adminPort})` : ""}
${includeClient ? `- **Public Website:** [http://localhost:${clientPort}](http://localhost:${clientPort})` : ""}

## 1-Minute Auto-Update Setup (Cronjob)
When \`NODE_ENV=production\` and \`AUTO_UPDATE=true\` in \`.env\`:
\`\`\`bash
(crontab -l 2>/dev/null; echo "* * * * * $(pwd)/scripts/auto-update.sh >> $(pwd)/logs/update.log 2>&1") | crontab -
\`\`\`
`;
  await fs.writeFile(path.join(projectDir, "README.md"), readmeContent, "utf-8");

  return {
    projectDir,
    includeClient,
    services,
    autoUpdate,
    nodeEnv: options.nodeEnv ?? "production",
    ports: {
      api: apiPort,
      admin: includeAdmin ? adminPort : undefined,
      client: includeClient ? clientPort : undefined,
    },
  };
}
