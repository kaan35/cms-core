import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { database } from "@cms/db";
import { logger } from "./LogService.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * DEV: Maps plugin names → local TypeScript source paths inside src/plugins/
 * This lets us run plugins without a build step during development.
 *
 * PRODUCTION: Plugins must be installed as npm packages with a pre-built dist/.
 * The PluginLoader will import them by package name directly (no map needed).
 * Workflow:
 *   1. npm install @cms/plugin-xyz  (on the server)
 *   2. Enable plugin in DB via admin panel
 *   3. Restart server → PluginLoader picks it up automatically
 */
const DEV_PLUGIN_PATHS: Record<string, string> = {
  "@cms/plugin-auth-api": join(__dirname, "../../../plugins/plugin-auth/api/index.ts"),
  "@cms/plugin-pages-api": join(__dirname, "../../../plugins/plugin-pages/api/index.ts"),
  "@cms/plugin-blog-api": join(__dirname, "../../../plugins/plugin-blog/api/index.ts"),
  "@cms/plugin-forms-api": join(__dirname, "../../../plugins/plugin-forms/api/index.ts"),
  "@cms/plugin-system-api": join(__dirname, "../../../plugins/plugin-system/api/index.ts"),
};

export class PluginLoader {
  private static pluginStates: Map<string, boolean> = new Map();

  static async loadAll(app: any): Promise<void> {
    try {
      const pluginCol = database.getCollection("cms_plugins");
      const activePlugins = await pluginCol.find({ isEnabled: true }).toArray();

      logger.info(`🔌 PluginLoader: Found ${activePlugins.length} active plugins in DB`);

      // Store all plugin states (enabled/disabled)
      const allPlugins = await pluginCol.find({}).toArray();
      for (const p of allPlugins) {
        this.pluginStates.set(p.name, p.isEnabled);
      }

      // Sort plugins: @cms/plugin-auth-api MUST load first (provides checkPermission decorator)
      const sortedPlugins = activePlugins.sort((a, b) => {
        if (a.name === "@cms/plugin-auth-api") return -1;
        if (b.name === "@cms/plugin-auth-api") return 1;
        return 0;
      });

      for (const p of sortedPlugins) {
        logger.info(`🔌 PluginLoader: Loading [${p.name}]...`);
        try {
          // If a local plugin source path exists, use it. Otherwise import by package name.
          const importPath = DEV_PLUGIN_PATHS[p.name] ?? p.name;

          const module = await import(importPath);
          const pluginInstance = module.default || module;

          if (pluginInstance && typeof pluginInstance.register === "function") {
            await app.register(pluginInstance.register, p.config || {});
            logger.info(`✅ PluginLoader: Registered [${p.name}]`);
          } else {
            logger.warn(`⚠️  PluginLoader: [${p.name}] has no register() export — skipping`);
          }
        } catch (err) {
          logger.error(err, `💥 PluginLoader: Failed to load [${p.name}] — server continues without it`);
        }
      }
    } catch (err) {
      logger.error(err, "💥 PluginLoader: Could not read plugins from database");
    }
  }

  /**
   * Check if a plugin is enabled (cached in memory)
   */
  static isEnabled(pluginName: string): boolean {
    return this.pluginStates.get(pluginName) ?? false;
  }

  /**
   * Reload plugin states from database (call after toggle)
   */
  static async reloadStates(): Promise<void> {
    try {
      const pluginCol = database.getCollection("cms_plugins");
      const allPlugins = await pluginCol.find({}).toArray();

      for (const p of allPlugins) {
        this.pluginStates.set(p.name, p.isEnabled);
      }

      logger.info("🔌 PluginLoader: Plugin states reloaded from database");
    } catch (err) {
      logger.error(err, "💥 PluginLoader: Failed to reload plugin states");
    }
  }
}
