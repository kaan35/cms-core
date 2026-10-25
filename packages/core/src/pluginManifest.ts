import type { ILogger } from "./types/ILogger.js";
import type { PluginManifestEntry } from "./types/plugin.js";

/**
 * Empty default manifest for @cms/core.
 * Real plugin manifests are composed at application composition roots (e.g. api/src/plugins.ts).
 */
export const PLUGIN_MANIFEST: PluginManifestEntry[] = [];

/**
 * Filters and resolves the provided plugin manifest according to the given plugins selection string.
 * Supports "minimal" (auth + system only), comma-separated list of plugins, or "full" (all provided).
 */
export async function resolvePluginManifest(
  baseManifest: PluginManifestEntry[] = PLUGIN_MANIFEST,
  logger?: ILogger | undefined,
  plugins?: "minimal" | "full" | string | undefined,
): Promise<PluginManifestEntry[]> {
  logger?.debug("Resolving available plugin manifests for server bootstrap", { plugins });
  let filteredBase: PluginManifestEntry[];
  if (plugins === "minimal") {
    filteredBase = baseManifest.filter(
      (e) => e.name === "plugin-auth" || e.name === "plugin-system",
    );
  } else if (plugins && plugins !== "full") {
    const requested = plugins
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => (s.startsWith("plugin-") ? s : `plugin-${s}`));

    if (baseManifest.length > 0) {
      const availableNames = new Set(baseManifest.map((e) => e.name));
      const unknown = requested.filter((name) => !availableNames.has(name));
      if (unknown.length > 0) {
        const validList = Array.from(availableNames).join(", ");
        throw new Error(
          `Unknown plugin(s) in PLUGINS: ${unknown.join(", ")}. Available plugins: ${validList}`,
        );
      }
    }

    const list = [...requested, "plugin-auth", "plugin-system"];
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
