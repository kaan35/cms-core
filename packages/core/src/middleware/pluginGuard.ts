import type { FastifyRequest, FastifyReply } from "fastify";
import { pluginLoader } from "../PluginLoader.ts";

/**
 * Creates a Fastify preHandler hook to verify that a plugin is enabled.
 *
 * @param pluginName - The plugin's registered name (e.g. "@cms/plugin-blog-api")
 * @param routePrefix - The URL prefix owned by this plugin (e.g. "/blog", "/forms").
 *                      The guard only activates for routes starting with this prefix.
 *                      This prevents fp-scoped hooks from blocking unrelated routes
 *                      (e.g. /auth/login) when a plugin is disabled.
 *
 * If the plugin is disabled and the request matches the prefix, returns 503.
 */
export function createPluginGuard(pluginName: string, routePrefix: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Only guard routes that belong to this plugin
    if (!request.url.startsWith(routePrefix)) return;

    if (!pluginLoader.isEnabled(pluginName)) {
      reply.status(503).send({
        status: "error",
        message: `Plugin [${pluginName}] is currently disabled`,
      });
    }
  };
}
