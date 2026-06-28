import type { FastifyRequest, FastifyReply } from "fastify";
import { pluginLoader } from "../PluginLoader.ts";

/**
 * Creates a Fastify preHandler hook to verify that a plugin is enabled.
 * If disabled, returns a 503 Service Unavailable response.
 */
export function createPluginGuard(pluginName: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!pluginLoader.isEnabled(pluginName)) {
      reply.status(503).send({
        status: "error",
        message: `Plugin [${pluginName}] is currently disabled`
      });
    }
  };
}
