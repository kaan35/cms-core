import type { PluginManifestEntry } from "./types/plugin.js";

export const PLUGIN_MANIFEST: PluginManifestEntry[] = [
  {
    name: "plugin-auth",
    priority: 0,
    migrations: [
      {
        id: "202601010000_init_auth",
        description: "Initialize auth collections (users, roles, sessions) and default admin role",
        up: async (db) => {
          const { initAuthMigration } = await import("@cms/plugin-auth-api" as string);
          await initAuthMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
      const { registerAuthPlugin } = await import("@cms/plugin-auth-api" as string);
      await registerAuthPlugin(scope, services);
    },
  },
  {
    name: "plugin-system",
    priority: 5,
    migrations: [
      {
        id: "202601020000_init_system",
        description: "Create indexes for cms_plugins, cms_feature_flags, and cms_audit_log",
        up: async (db) => {
          const { initSystemMigration } = await import("@cms/plugin-system-api" as string);
          await initSystemMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
      const { registerSystemPlugin } = await import("@cms/plugin-system-api" as string);
      await registerSystemPlugin(scope, services);
    },
  },
  {
    name: "plugin-media",
    priority: 10,
    migrations: [
      {
        id: "202601030000_init_media",
        description: "Create indexes for cms_media",
        up: async (db) => {
          const { initMediaMigration } = await import("@cms/plugin-media-api" as string);
          await initMediaMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
      const { registerMediaPlugin } = await import("@cms/plugin-media-api" as string);
      await registerMediaPlugin(scope, services);
    },
  },
];
