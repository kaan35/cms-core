import type { PluginManifestEntry } from "./types/plugin.js";

export const PLUGIN_MANIFEST: PluginManifestEntry[] = [
  {
    name: "plugin-auth",
    priority: 0,
    register: async (scope, services) => {
      const { registerAuthPlugin } = await import("@cms/plugin-auth-api" as string);
      await registerAuthPlugin(scope, services);
    },
  },
];
