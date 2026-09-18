import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_IGNORE = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  ".turbo",
  ".DS_Store",
  "tsconfig.tsbuildinfo",
]);

export async function copyDirectory(
  source: string,
  destination: string,
  ignoreSet: Set<string> = DEFAULT_IGNORE,
): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoreSet.has(entry.name)) {
      continue;
    }

    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, ignoreSet);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      await fs.copyFile(srcPath, destPath);
      // Preserve executable permissions
      const stat = await fs.stat(srcPath);
      if ((stat.mode & 0o111) !== 0) {
        await fs.chmod(destPath, stat.mode);
      }
    }
  }
}
