import type { FastifyInstance } from "fastify";
import { database } from "@cms/db";
import { logger } from "./LogService.ts";

export class PluginLoader {
  private pluginStates: Map<string, boolean> = new Map();

  async loadAll(app: FastifyInstance): Promise<void> {
    try {
      const pluginCol = database.getCollection("cms_plugins");
      const activePlugins = await pluginCol.find({ isEnabled: true }).toArray();

      logger.info(`🔌 PluginLoader: Found ${activePlugins.length} active plugins in DB`);

      // Store all plugin states (enabled/disabled)
      const allPlugins = await pluginCol.find({}).toArray();
      for (const p of allPlugins) {
        this.pluginStates.set(p.name, p.isEnabled);
      }

      // Sort plugins by priority (higher priority loads first)
      const sortedPlugins = activePlugins.sort((a, b) => 
        (b.priority ?? 50) - (a.priority ?? 50)
      );

      for (const p of sortedPlugins) {
        logger.info(`🔌 PluginLoader: Loading [${p.name}] (priority: ${p.priority ?? 50})...`);
        try {
          // Import by package name - workspace resolution handles dev mode automatically
          const module = await import(p.name);
          const pluginInstance = module.default || module;

          if (pluginInstance && typeof pluginInstance.register === "function") {
            await app.register(pluginInstance.register, p.config || {});
            logger.info(`✅ PluginLoader: Registered [${p.name}]`);
          } else {
            logger.warn(`⚠️  PluginLoader: [${p.name}] has no register() export — skipping`);
          }
        } catch (err) {
          logger.error(err, `💥 PluginLoader: Failed to load [${p.name}] — server continues without it`);
          if (p.name === "@cms/plugin-auth-api") {
            throw new Error("Critical plugin @cms/plugin-auth-api failed to load. Crashing server.");
          }
        }
      }
    } catch (err) {
      logger.error(err, "💥 PluginLoader: Could not read plugins from database");
    }
  }

  /**
   * Check if a plugin is enabled (cached in memory)
   */
  isEnabled(pluginName: string): boolean {
    return this.pluginStates.get(pluginName) ?? false;
  }

  /**
   * Reload plugin states from database (call after toggle)
   */
  async reloadStates(): Promise<void> {
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

export const pluginLoader = new PluginLoader();
