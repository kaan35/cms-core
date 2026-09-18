#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = existsSync(path.join(__dirname, "../dist/index.js"))
  ? "../dist/index.js"
  : "../src/index.js";

const { runCli } = await import(entry);
await runCli(process.argv.slice(2));
