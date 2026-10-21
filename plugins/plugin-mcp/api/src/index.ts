import type { FastifyInstance } from "fastify";
import type { CoreServices } from "@cms/core";
import { mcpRoutes } from "./routes/mcpRoutes.js";

export async function registerMcpPlugin(
  app: FastifyInstance,
  _services: CoreServices,
): Promise<void> {
  await app.register(mcpRoutes);
}

export * from "./server/createMcpServer.js";
export * from "./client/cmsApiClient.js";
export * from "./tools/systemTools.js";
export * from "./tools/pagesTools.js";
export * from "./tools/blogTools.js";
export * from "./tools/formsTools.js";
