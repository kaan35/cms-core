import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { hooks, pluginLoader, parseObjectId } from "@cms/core";

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

  const pluginCol = db.getCollection("cms_plugins");
  const settingsCol = db.getCollection("cms_settings");

  // List all plugins
  fastify.get(
    "/plugins",
    {
      preHandler: [authenticate, checkPermission("settings:read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const plugins = await pluginCol.find({}).sort({ name: 1 }).toArray();
      
      const serialized = plugins.map(p => ({
        _id: p._id.toString(),
        name: p.name,
        displayName: p.displayName || p.name,
        version: p.version || "1.0.0",
        description: p.description || "",
        isEnabled: p.isEnabled,
        config: p.config || {},
      }));

      return { status: "success", plugins: serialized };
    }
  );

  // Toggle plugin enabled status
  fastify.put(
    "/plugins/:id/toggle",
    {
      preHandler: [authenticate, checkPermission("settings:write")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      let objectId;
      try {
        objectId = parseObjectId(id);
      } catch {
        reply.status(400).send({ status: "error", message: "Invalid plugin ID" });
        return;
      }

      const plugin = await pluginCol.findOne({ _id: objectId });
      if (!plugin) {
        reply.status(404).send({ status: "error", message: "Plugin not found" });
        return;
      }

      const newStatus = !plugin.isEnabled;
      await pluginCol.updateOne(
        { _id: objectId },
        { $set: { isEnabled: newStatus } }
      );

      logger.info(`🔌 Plugin [${plugin.name}] ${newStatus ? "enabled" : "disabled"}`);

      // Reload plugin states in PluginLoader (no restart needed!)
      await pluginLoader.reloadStates();

      return {
        status: "success",
        message: `Plugin ${newStatus ? "enabled" : "disabled"}. Changes applied immediately.`,
        isEnabled: newStatus,
      };
    }
  );

  // --- GLOBAL SETTINGS ENDPOINTS (Decoupled from Pages Plugin) ---

  // Get settings
  fastify.get("/settings", async () => {
    let settings = await settingsCol.findOne({});
    if (!settings) {
      // Return defaults if not set in DB yet
      settings = {
        brandName: "ModularCMS",
        primaryColor: "#8b5cf6",
        secondaryColor: "#4f46e5",
      };
    }
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

      await settingsCol.updateOne(
        {},
        {
          $set: {
            brandName: body.brandName,
            primaryColor: body.primaryColor,
            secondaryColor: body.secondaryColor,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Emit event
      hooks.emit("settings.updated", body, request.user, request.ip);

      return { status: "success", message: "Settings updated successfully", settings: body };
    }
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
