import type { ILogger } from "./types/ILogger.js";
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
  {
    name: "plugin-pages",
    priority: 15,
    migrations: [
      {
        id: "202601040000_init_pages",
        description: "Create indexes for cms_pages and cms_page_versions",
        up: async (db) => {
          const { initPagesMigration } = await import("@cms/plugin-pages-api" as string);
          await initPagesMigration.up(db);
        },
      },
      {
        id: "202608200001_seed_home_page",
        description: "Create index for pageType and seed default home page",
        up: async (db) => {
          const { seedHomePageMigration } = await import("@cms/plugin-pages-api" as string);
          await seedHomePageMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
      const { registerPagesPlugin } = await import("@cms/plugin-pages-api" as string);
      await registerPagesPlugin(scope, services);
    },
  },
  {
    name: "plugin-blog",
    priority: 20,
    migrations: [
      {
        id: "202601050000_init_blog",
        description: "Create indexes for cms_blog_posts and cms_post_versions",
        up: async (db) => {
          const { initBlogMigration } = await import("@cms/plugin-blog-api" as string);
          await initBlogMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
      const { registerBlogPlugin } = await import("@cms/plugin-blog-api" as string);
      await registerBlogPlugin(scope, services);
    },
  },
  {
    name: "plugin-forms",
    priority: 25,
    migrations: [
      {
        id: "202601060000_init_forms",
        description: "Create indexes for cms_forms and cms_form_submissions",
        up: async (db) => {
          const { initFormsMigration } = await import("@cms/plugin-forms-api" as string);
          await initFormsMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
      const { registerFormsPlugin } = await import("@cms/plugin-forms-api" as string);
      await registerFormsPlugin(scope, services);
    },
  },
  {
    name: "plugin-vault",
    priority: 30,
    migrations: [
      {
        id: "202601070000_init_vault",
        description: "Create indexes for cms_vault_items",
        up: async (db) => {
          const { initVaultMigration } = await import("@cms/plugin-vault-api" as string);
          await initVaultMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
      const { registerVaultPlugin } = await import("@cms/plugin-vault-api" as string);
      await registerVaultPlugin(scope, services);
    },
  },
];

const PLUGIN_MODULE_MAP: Record<string, string> = {
  "plugin-auth": "@cms/plugin-auth-api",
  "plugin-system": "@cms/plugin-system-api",
  "plugin-media": "@cms/plugin-media-api",
  "plugin-pages": "@cms/plugin-pages-api",
  "plugin-blog": "@cms/plugin-blog-api",
  "plugin-forms": "@cms/plugin-forms-api",
  "plugin-vault": "@cms/plugin-vault-api",
};

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
  const activeEntries: PluginManifestEntry[] = [];
  for (const entry of filteredBase) {
    const pkg = PLUGIN_MODULE_MAP[entry.name];
    if (!pkg) {
      activeEntries.push(entry);
      continue;
    }
    try {
      await import(pkg as string);
      activeEntries.push(entry);
      logger?.debug("Plugin manifest resolved", { plugin: entry.name, package: pkg });
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      const isMissing =
        error.code === "ERR_MODULE_NOT_FOUND" ||
        (error.message && error.message.includes("Cannot find module"));
      if (isMissing) {
        if (entry.name === "plugin-auth" || entry.name === "plugin-system") {
          throw err;
        }
        logger?.debug("Optional plugin not installed, skipping", {
          plugin: entry.name,
          package: pkg,
        });
        continue;
      }
      throw err;
    }
  }
  logger?.debug("Plugin manifest resolution complete", {
    totalResolved: activeEntries.length,
    plugins: activeEntries.map((e) => e.name),
  });
  return activeEntries;
}
