import path from "node:path";
import { parseArgs } from "node:util";
import { createNewProject } from "./newProject.js";
import { upgradeProject } from "./upgradeProject.js";
import { printHelp } from "./utils/help.js";
import { CURRENT_CMS_VERSION } from "./utils/pinnedVersions.js";
import { promptNewProject } from "./utils/prompt.js";

export { createNewProject, upgradeProject };

export async function runCli(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      profile: { type: "string" },
      admin: { type: "boolean" },
      "no-admin": { type: "boolean" },
      client: { type: "boolean" },
      "no-client": { type: "boolean" },
      "cms-tag": { type: "string" },
      "api-port": { type: "string" },
      "admin-port": { type: "string" },
      "client-port": { type: "string" },
      "auto-update": { type: "boolean" },
      "no-auto-update": { type: "boolean" },
      dir: { type: "string" },
      env: { type: "string" },
      yes: { type: "boolean", short: "y" },
      interactive: { type: "boolean", short: "i" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.version) {
    console.log(`cms v${CURRENT_CMS_VERSION}`);
    return;
  }

  if (values.help || positionals.length === 0) {
    printHelp();
    return;
  }

  const command = positionals[0];

  if (command === "new") {
    const hasFlags = Boolean(
      values.profile ||
      values.admin !== undefined ||
      values["no-admin"] ||
      values.client !== undefined ||
      values["no-client"] ||
      values["cms-tag"] ||
      values["api-port"] ||
      values["admin-port"] ||
      values["client-port"] ||
      values.dir ||
      values.env ||
      values["no-auto-update"] ||
      values["auto-update"] !== undefined ||
      values.yes,
    );

    const isInteractive =
      Boolean(values.interactive) || (!hasFlags && Boolean(process.stdin.isTTY) && !values.yes);

    let projectName = positionals[1];
    let targetDir = values.dir as string | undefined;
    let pluginsProfile = values.profile as "minimal" | "full" | undefined;
    let includeAdmin = values["no-admin"] ? false : values.admin ? true : undefined;
    let includeClient = values["no-client"] ? false : values.client ? true : undefined;
    let nodeEnv = (values.env as "production" | "development") || undefined;
    let apiPort = values["api-port"] ? parseInt(values["api-port"] as string, 10) : undefined;
    let adminPort = values["admin-port"] ? parseInt(values["admin-port"] as string, 10) : undefined;
    let clientPort = values["client-port"]
      ? parseInt(values["client-port"] as string, 10)
      : undefined;
    let autoUpdate = values["no-auto-update"] ? false : Boolean(values["auto-update"] ?? true);

    if (isInteractive) {
      let answers: Awaited<ReturnType<typeof promptNewProject>>;
      try {
        answers = await promptNewProject({
          projectName,
          targetDir: targetDir || "./projects",
          nodeEnv,
          apiPort,
          adminPort,
          clientPort,
          autoUpdate,
          includeAdmin,
          includeClient,
          pluginsProfile,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.startsWith("Setup cancelled")) {
          console.log(`\n${err.message}`);
          return;
        }
        throw err;
      }

      projectName = answers.projectName;
      targetDir = answers.targetDir;
      nodeEnv = answers.nodeEnv;
      apiPort = answers.apiPort;
      adminPort = answers.adminPort;
      clientPort = answers.clientPort;
      autoUpdate = answers.autoUpdate;
      includeAdmin = answers.includeAdmin;
      includeClient = answers.includeClient;
      pluginsProfile = answers.pluginsProfile;
    } else {
      if (!projectName) {
        console.error("Error: Please provide a project name. Example: cms new my-corp-site");
        process.exitCode = 1;
        return;
      }
      includeAdmin = includeAdmin ?? true;
      includeClient = includeClient ?? false;
      pluginsProfile = pluginsProfile ?? (includeClient ? "full" : "minimal");
      targetDir = targetDir || "./projects";
    }

    try {
      console.log(
        `Scaffolding new project "${projectName}"${includeClient ? " [with client]" : ""}...`,
      );
      const result = await createNewProject({
        projectName,
        targetDir,
        nodeEnv,
        cmsTag: (values["cms-tag"] as string) || undefined,
        autoUpdate,
        apiPort,
        adminPort,
        clientPort,
        includeAdmin,
        includeClient,
        pluginsProfile,
      });

      console.log(`\nProject created successfully at: ${result.projectDir}`);
      console.log(`Configured services: ${result.services.join(", ")}`);
      console.log(`Endpoints:`);
      console.log(`  - REST API:    http://localhost:${result.ports.api}`);
      if (result.ports.admin) {
        console.log(`  - Admin Panel: http://localhost:${result.ports.admin}`);
      }
      if (result.ports.client) {
        console.log(`  - Client Site: http://localhost:${result.ports.client}`);
      }
      console.log(`\nTo get started:`);
      const relPath = path.relative(process.cwd(), result.projectDir);
      const cdPath = relPath.startsWith("..") ? result.projectDir : relPath;
      console.log(`  cd ${cdPath}`);
      if (result.nodeEnv === "development" && result.includeClient) {
        console.log(`  docker compose up -d api admin  # Start Core CMS & Database`);
        console.log(`  npm run dev                     # Start Client Site with hot-reload`);
      } else {
        console.log(`  docker compose up -d`);
      }
    } catch (err: unknown) {
      console.error(`Scaffolding failed:`, err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
    return;
  }

  if (command === "upgrade") {
    const targetVersion = positionals[1] || (values["cms-tag"] as string);
    if (!targetVersion) {
      console.error("Error: Please specify the target CMS version tag. Example: cms upgrade 0.2.0");
      process.exitCode = 1;
      return;
    }

    try {
      const result = await upgradeProject({
        projectDir: (values.dir as string) || undefined,
        targetVersion,
      });

      if (!result.envUpdated) {
        console.log(`Project is already configured for CMS tag: ${result.newTag}`);
      } else {
        console.log(`Successfully upgraded CMS tag: ${result.previousTag} -> ${result.newTag}`);
        console.log(`Updated: ${result.projectDir}/.env`);
        console.log(
          `Run "docker compose pull && docker compose up -d" or wait for the auto-update cron to apply changes.`,
        );
      }
    } catch (err: unknown) {
      console.error(`Upgrade failed:`, err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
    return;
  }

  console.error(`Unknown command: "${command}". Run "cms --help" for available commands.`);
  process.exitCode = 1;
}
