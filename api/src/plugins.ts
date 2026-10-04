import type { PluginManifestEntry } from "@cms/core";
import { initAuthMigration, registerAuthPlugin } from "@cms/plugin-auth-api";
import { initBlogMigration, registerBlogPlugin } from "@cms/plugin-blog-api";
import { initFormsMigration, registerFormsPlugin } from "@cms/plugin-forms-api";
import { initMediaMigration, registerMediaPlugin } from "@cms/plugin-media-api";
import {
  initPagesMigration,
  registerPagesPlugin,
  seedHomePageMigration,
} from "@cms/plugin-pages-api";
import { initSystemMigration, registerSystemPlugin } from "@cms/plugin-system-api";
import { initVaultMigration, registerVaultPlugin } from "@cms/plugin-vault-api";

export const API_PLUGIN_MANIFEST: PluginManifestEntry[] = [
  {
    name: "plugin-auth",
    priority: 0,
    migrations: [
      {
        id: "202601010000_init_auth",
        description: "Initialize auth collections (users, roles, sessions) and default admin role",
        up: async (db) => {
          await initAuthMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
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
          await initSystemMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
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
          await initMediaMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
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
          await initPagesMigration.up(db);
        },
      },
      {
        id: "202608200001_seed_home_page",
        description: "Create index for pageType and seed default home page",
        up: async (db) => {
          await seedHomePageMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
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
          await initBlogMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
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
          await initFormsMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
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
          await initVaultMigration.up(db);
        },
      },
    ],
    register: async (scope, services) => {
      await registerVaultPlugin(scope, services);
    },
  },
];
