import type { ILogger } from "./types/ILogger.js";
import type { PluginManifestEntry } from "./types/plugin.js";

/**
 * Empty default manifest for @cms/core.
 * Real plugin manifests are composed at application composition roots (e.g. api/src/plugins.ts).
 */
export const PLUGIN_MANIFEST: PluginManifestEntry[] = [];

/**
 * Filters and resolves the provided plugin manifest according to the given profile string.
 * Supports "minimal" (auth + system only), comma-separated list of plugins, or "full" (all provided).
 */
export async function resolvePluginManifest(
  baseManifest: PluginManifestEntry[] = PLUGIN_MANIFEST,
  logger?: ILogger | undefined,
  profile?: "minimal" | "full" | string | undefined,
): Promise<PluginManifestEntry[]> {
  logger?.debug("Resolving available plugin manifests for server bootstrap", { profile });
  let filteredBase: PluginManifestEntry[];
  if (profile === "minimal") {
    filteredBase = baseManifest.filter(
      (e) => e.name === "plugin-auth" || e.name === "plugin-system",
    );
  } else if (profile && profile !== "full") {
    const list = profile
      .split(",")
      .map((s) => (s.trim().startsWith("plugin-") ? s.trim() : `plugin-${s.trim()}`));
    list.push("plugin-auth", "plugin-system");
    const allowed = new Set(list);
    filteredBase = baseManifest.filter((e) => allowed.has(e.name));
  } else {
    filteredBase = baseManifest;
  }

  logger?.debug("Plugin manifest resolution complete", {
    totalResolved: filteredBase.length,
    plugins: filteredBase.map((e) => e.name),
  });
  return filteredBase;
}
