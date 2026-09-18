import fs from "node:fs/promises";
import path from "node:path";

export interface UpgradeOptions {
  projectDir?: string | undefined;
  targetVersion: string;
}

export interface UpgradeResult {
  projectDir: string;
  previousTag: string;
  newTag: string;
  envUpdated: boolean;
}

export async function upgradeProject(options: UpgradeOptions): Promise<UpgradeResult> {
  const projectDir = path.resolve(options.projectDir ?? process.cwd());
  const envPath = path.join(projectDir, ".env");

  // 1. Verify project directory has .env
  let envRaw: string;
  try {
    envRaw = await fs.readFile(envPath, "utf-8");
  } catch (err: unknown) {
    throw new Error(
      `Cannot find .env file in "${projectDir}". Ensure you are running "cms upgrade" inside a valid project directory.`,
      { cause: err },
    );
  }

  // 2. Parse current CMS_TAG
  const tagMatch = envRaw.match(/^CMS_TAG=(.*)$/m);
  const previousTag = tagMatch?.[1]?.trim() ?? "unknown";
  const newTag = options.targetVersion.trim();

  if (previousTag === newTag) {
    return {
      projectDir,
      previousTag,
      newTag,
      envUpdated: false,
    };
  }

  // 3. Rewrite CMS_TAG in .env (Rule 34: exact string replacement)
  let updatedEnv: string;
  if (tagMatch) {
    updatedEnv = envRaw.replace(/^CMS_TAG=.*$/m, `CMS_TAG=${newTag}`);
  } else {
    updatedEnv = `CMS_TAG=${newTag}\n` + envRaw;
  }

  await fs.writeFile(envPath, updatedEnv, "utf-8");

  return {
    projectDir,
    previousTag,
    newTag,
    envUpdated: true,
  };
}
