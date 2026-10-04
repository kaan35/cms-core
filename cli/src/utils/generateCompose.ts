import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDefaultTemplatesDir(): string {
  return path.resolve(__dirname, "../../templates");
}

export interface GenerateComposeOptions {
  includeAdmin?: boolean | undefined;
  includeClient?: boolean | undefined;
  templatesDir?: string | undefined;
}

export function generateComposeContent(options: GenerateComposeOptions = {}): string {
  const includeAdmin = options.includeAdmin !== false;
  const includeClient = Boolean(options.includeClient);
  const templatesDir = options.templatesDir ?? getDefaultTemplatesDir();

  const templatePath = includeAdmin
    ? path.join(templatesDir, "docker-compose.yml")
    : path.join(templatesDir, "docker-compose.api-only.yml");

  let content = fs.readFileSync(templatePath, "utf-8");

  if (includeClient) {
    const clientFragment = fs.readFileSync(
      path.join(templatesDir, "docker-compose.client.fragment.yml"),
      "utf-8",
    );
    content = content.replace("\n  mongo:", `\n${clientFragment}\n  mongo:`);
  }

  return content;
}

export function generateDevComposeContent(options: GenerateComposeOptions = {}): string {
  const includeAdmin = options.includeAdmin !== false;
  const templatesDir = options.templatesDir ?? getDefaultTemplatesDir();

  const templatePath = includeAdmin
    ? path.join(templatesDir, "docker-compose.dev.yml")
    : path.join(templatesDir, "docker-compose.dev.api-only.yml");

  return fs.readFileSync(templatePath, "utf-8");
}

export interface CopyComposeFilesOptions {
  projectDir: string;
  templatesDir: string;
  includeAdmin?: boolean | undefined;
  includeClient?: boolean | undefined;
}

export async function copyComposeFiles(options: CopyComposeFilesOptions): Promise<void> {
  const includeAdmin = options.includeAdmin !== false;
  const includeClient = Boolean(options.includeClient);

  const composeTemplate = includeAdmin
    ? path.join(options.templatesDir, "docker-compose.yml")
    : path.join(options.templatesDir, "docker-compose.api-only.yml");

  const devComposeTemplate = includeAdmin
    ? path.join(options.templatesDir, "docker-compose.dev.yml")
    : path.join(options.templatesDir, "docker-compose.dev.api-only.yml");

  const destCompose = path.join(options.projectDir, "docker-compose.yml");
  const destDevCompose = path.join(options.projectDir, "docker-compose.dev.yml");

  await fsPromises.copyFile(devComposeTemplate, destDevCompose);

  if (!includeClient) {
    await fsPromises.copyFile(composeTemplate, destCompose);
  } else {
    const baseContent = await fsPromises.readFile(composeTemplate, "utf-8");
    const clientFragment = await fsPromises.readFile(
      path.join(options.templatesDir, "docker-compose.client.fragment.yml"),
      "utf-8",
    );
    const content = baseContent.replace("\n  mongo:", `\n${clientFragment}\n  mongo:`);
    await fsPromises.writeFile(destCompose, content, "utf-8");
  }
}
