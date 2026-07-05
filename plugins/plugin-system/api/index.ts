import { hooks, pluginLoader } from "@cms/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { PluginsRepository } from "./PluginsRepository.ts";
import { SettingsRepository } from "./SettingsRepository.ts";

const settingsSchema = z.object({
  brandName: z.string().min(1),
  primaryColor: z.string().min(4),
  secondaryColor: z.string().min(4),
});

export const name = "@cms/plugin-system-api";
export const version = "1.0.0";

async function register(fastify: FastifyInstance, _options: Record<string, unknown> = {}) {
  const db = fastify.db;
  const logger = fastify.logger;
  const authenticate = fastify.authenticate;
  const checkPermission = fastify.checkPermission;

  logger.info("🔌 Plugin-System: Initializing plugin management and settings routes...");

  const pluginsRepo = new PluginsRepository(db, logger);
  const settingsRepo = new SettingsRepository(db, logger);

  // List all plugins
  fastify.get(
    "/plugins",
    {
      preHandler: [authenticate, checkPermission("settings:read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const plugins = await pluginsRepo.findAll();

      const serialized = plugins.map((p) => ({
        _id: p._id ? p._id.toString() : "",
        name: p.name,
        displayName: p.displayName || p.name,
        version: p.version || "1.0.0",
        description: p.description || "",
        isEnabled: p.isEnabled,
        config: p.config || {},
      }));

      return { status: "success", plugins: serialized };
    },
  );

  // Toggle plugin enabled status
  fastify.put(
    "/plugins/:id/toggle",
    {
      preHandler: [authenticate, checkPermission("settings:write")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const plugin = await pluginsRepo.findById(id);
      if (!plugin) {
        reply.status(404).send({ status: "error", message: "Plugin not found" });
        return;
      }

      const toggleResult = await pluginsRepo.toggleEnabled(id);
      if (!toggleResult || !toggleResult.success) {
        reply.status(500).send({ status: "error", message: "Failed to toggle plugin" });
        return;
      }

      logger.info(`🔌 Plugin [${plugin.name}] ${toggleResult.isEnabled ? "enabled" : "disabled"}`);

      // Reload plugin states in PluginLoader (no restart needed!)
      await pluginLoader.reloadStates();

      return {
        status: "success",
        message: `Plugin ${toggleResult.isEnabled ? "enabled" : "disabled"}. Changes applied immediately.`,
        isEnabled: toggleResult.isEnabled,
      };
    },
  );

  // --- GLOBAL SETTINGS ENDPOINTS (Decoupled from Pages Plugin) ---

  // Get settings
  fastify.get("/settings", async () => {
    const settings = await settingsRepo.get();
    return { status: "success", settings };
  });

  // Update settings
  fastify.put(
    "/settings",
    {
      preHandler: [authenticate, checkPermission("settings:write")],
      schema: { body: settingsSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof settingsSchema>;

      await settingsRepo.update({
        brandName: body.brandName,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
      });

      // Emit event
      hooks.emit("settings.updated", body, request.user, request.ip);

      return { status: "success", message: "Settings updated successfully", settings: body };
    },
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
