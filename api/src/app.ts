import type { ICache, IDatabase, PluginManifestEntry } from "@cms/core";
import { createServer } from "@cms/core";
import type { FastifyInstance } from "fastify";

/**
 * Builds and configures the Fastify application with core plugins.
 */
export async function buildApp(
  db: IDatabase,
  cache: ICache,
  env: Record<string, string | undefined> = process.env,
  customManifest?: PluginManifestEntry[],
): Promise<FastifyInstance> {
  return createServer(db, cache, env, customManifest);
}
