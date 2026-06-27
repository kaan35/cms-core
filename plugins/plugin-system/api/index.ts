import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { ObjectId } from "mongodb";

export const name = "@cms/plugin-system-api";
export const version = "1.0.0";

async function register(fastify: FastifyInstance, options: any) {
  const db = (fastify as any).db;
  const logger = (fastify as any).logger;
  const authenticate = (fastify as any).authenticate;

  logger.info("🔌 Plugin-System: Initializing plugin management routes...");

  const pluginCol = db.getCollection("cms_plugins");

  // Helper to check permission
  const checkPermission = (permission: string) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      if (!user || !user.permissions.includes(permission)) {
        reply.status(403).send({ status: "error", message: "Forbidden" });
      }
    };
  };

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
        objectId = new ObjectId(id);
      } catch (err) {
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
      const PluginLoader = (await import("@cms/core")).PluginLoader;
      await PluginLoader.reloadStates();

      return {
        status: "success",
        message: `Plugin ${newStatus ? "enabled" : "disabled"}. Changes applied immediately.`,
        isEnabled: newStatus,
      };
    }
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
