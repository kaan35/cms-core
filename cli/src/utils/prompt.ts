import fs from "node:fs/promises";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline";
import type { PluginProfile } from "./pinnedVersions.js";

export interface PromptNewProjectOptions {
  projectName?: string | undefined;
  targetDir?: string | undefined;
  nodeEnv?: "production" | "development" | undefined;
  apiPort?: number | undefined;
  adminPort?: number | undefined;
  clientPort?: number | undefined;
  autoUpdate?: boolean | undefined;
  includeAdmin?: boolean | undefined;
  includeClient?: boolean | undefined;
  pluginsProfile?: PluginProfile | undefined;
}

export interface PromptResult {
  projectName: string;
  targetDir: string;
  nodeEnv: "production" | "development";
  apiPort: number;
  adminPort?: number | undefined;
  clientPort?: number | undefined;
  autoUpdate: boolean;
  includeAdmin: boolean;
  includeClient: boolean;
  pluginsProfile: PluginProfile;
}

export async function promptNewProject(
  defaults: PromptNewProjectOptions = {},
): Promise<PromptResult> {
  const rl = readline.createInterface({ input, output });
  const it = rl[Symbol.asyncIterator]();

  const ask = async (query: string): Promise<string> => {
    output.write(query);
    const next = await it.next();
    if (next.done) {
      throw new Error("Setup cancelled: input stream closed.");
    }
    return (next.value ?? "").trim();
  };

  try {
    console.log("\n🚀 CMS Project Setup Wizard\n");

    // 1. Project Name
    let projectName = defaults.projectName?.trim();
    if (projectName) {
      const nameAnswer = await ask(`? Project name (${projectName}): `);
      if (nameAnswer) {
        projectName = nameAnswer;
      }
    } else {
      let attempts = 0;
      while (!projectName) {
        attempts++;
        if (attempts >= 5) {
          throw new Error("Setup cancelled: no project name provided.");
        }
        projectName = await ask("? Project name: ");
        if (!projectName) {
          console.log("  ⚠️  Project name cannot be empty. Please enter a valid name.");
        }
      }
    }

    // 2. Target Directory (default: ./projects)
    const defaultDir = defaults.targetDir || "./projects";
    const dirAnswer = await ask(`? Target directory (${defaultDir}): `);
    const targetDir = dirAnswer || defaultDir;

    // 2.1 Check if target directory already exists and handle overwrite / rename / cancel
    while (true) {
      const candidateDir = path.join(path.resolve(targetDir), projectName);
      try {
        const stat = await fs.stat(candidateDir);
        if (stat.isDirectory()) {
          const files = await fs.readdir(candidateDir);
          if (files.length > 0) {
            console.log(`\n  ⚠️  Directory "${candidateDir}" already exists and is not empty.`);
            console.log(`  1) Overwrite (remove existing directory and continue)`);
            console.log(`  2) Enter a different project name`);
            console.log(`  3) Cancel setup`);
            const choice = (await ask(`  Choice (1/2/3) [1]: `)).toLowerCase();

            if (choice === "1" || choice === "overwrite" || choice === "") {
              await fs.rm(candidateDir, { recursive: true, force: true });
              console.log(`  ✓ Cleared existing directory "${candidateDir}".\n`);
              break;
            } else if (choice === "2") {
              let attempts = 0;
              let newName = "";
              while (!newName && attempts < 5) {
                attempts++;
                newName = (await ask(`? New project name: `)).trim();
                if (!newName) {
                  console.log("  ⚠️  Project name cannot be empty.");
                }
              }
              if (!newName) {
                throw new Error("Setup cancelled: no valid project name provided.");
              }
              projectName = newName;
              continue;
            } else {
              throw new Error("Setup cancelled by user.");
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message.startsWith("Setup cancelled")) {
          throw err;
        }
        // Directory does not exist yet or ENOENT -> safe to proceed!
        break;
      }
      break;
    }

    // 3. Components Selection (Admin & Client)
    let includeAdmin = defaults.includeAdmin ?? true;
    if (defaults.includeAdmin === undefined) {
      const adminAnswer = await ask(`? Include Admin Management Panel? (Y/n) [Y]: `);
      includeAdmin = !adminAnswer.toLowerCase().startsWith("n");
    }

    let includeClient = defaults.includeClient;
    if (includeClient === undefined) {
      const clientAnswer = await ask(`? Include Next.js Web Client? (y/N) [N]: `);
      includeClient = clientAnswer.toLowerCase().startsWith("y");
    }

    // 4. Plugin Profile Selection
    let pluginsProfile: PluginProfile =
      defaults.pluginsProfile ?? (includeClient ? "full" : "minimal");
    if (defaults.pluginsProfile === undefined) {
      console.log(`? Select plugin profile:`);
      console.log(
        `  1) minimal  - Auth & System only (Ideal for custom apps, SaaS, Password Manager)`,
      );
      console.log(`  2) full     - Auth, System, Pages, Blog, Forms, Media (Full CMS)`);
      const defaultChoice = includeClient ? "2" : "1";
      const profileAnswer = await ask(`  Choice (1/2) [${defaultChoice}]: `);
      const trimmed = profileAnswer.trim().toLowerCase();
      if (trimmed === "1" || trimmed === "minimal") {
        pluginsProfile = "minimal";
      } else if (trimmed === "2" || trimmed === "full") {
        pluginsProfile = "full";
      } else {
        pluginsProfile = defaultChoice === "2" ? "full" : "minimal";
      }
    }

    // 5. Ports Configuration
    let apiPort = defaults.apiPort ?? 3001;
    let adminPort = includeAdmin ? (defaults.adminPort ?? 3002) : undefined;
    let clientPort = includeClient ? (defaults.clientPort ?? 3000) : undefined;

    const customizePortsAnswer = await ask(`? Configure custom ports? (y/N) [n]: `);
    if (customizePortsAnswer.toLowerCase().startsWith("y")) {
      const apiInput = await ask(`  Host port for API service (${apiPort}): `);
      if (apiInput) {
        const parsed = parseInt(apiInput, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < 65536) apiPort = parsed;
      }

      if (includeAdmin) {
        const adminInput = await ask(`  Host port for Admin Shell (${adminPort ?? 3002}): `);
        if (adminInput) {
          const parsed = parseInt(adminInput, 10);
          if (!isNaN(parsed) && parsed > 0 && parsed < 65536) adminPort = parsed;
        }
      }

      if (includeClient) {
        const clientInput = await ask(`  Host port for Client Site (${clientPort ?? 3000}): `);
        if (clientInput) {
          const parsed = parseInt(clientInput, 10);
          if (!isNaN(parsed) && parsed > 0 && parsed < 65536) clientPort = parsed;
        }
      }
    }

    // 6. Environment Mode (production / development)
    const envDefault = defaults.nodeEnv || "production";
    const envAnswer = await ask(`? Environment mode (production/development) [${envDefault}]: `);
    const nodeEnv: "production" | "development" = envAnswer.toLowerCase().startsWith("dev")
      ? "development"
      : envDefault;

    // 7. Auto-update Cron
    let autoUpdate = false;
    if (nodeEnv === "production") {
      const autoUpdateAnswer = await ask(`? Enable 1-minute auto-update cron script? (Y/n) [Y]: `);
      autoUpdate = !autoUpdateAnswer.toLowerCase().startsWith("n");
    } else {
      const autoUpdateAnswer = await ask(`? Enable 1-minute auto-update cron script? (y/N) [N]: `);
      autoUpdate = autoUpdateAnswer.toLowerCase().startsWith("y");
    }

    console.log(""); // Formatting spacer

    return {
      projectName,
      targetDir,
      nodeEnv,
      apiPort,
      adminPort,
      clientPort,
      autoUpdate,
      includeAdmin,
      includeClient,
      pluginsProfile,
    };
  } finally {
    rl.close();
  }
}
