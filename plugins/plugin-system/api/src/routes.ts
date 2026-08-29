import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SYSTEM_PERMISSIONS } from "./domain/system.rules.js";
import type { SystemController } from "./systemController.js";

export function registerSystemRoutes(app: FastifyInstance, controller: SystemController): void {
  const authenticate = (req: FastifyRequest, reply: FastifyReply) => app.authenticate(req, reply);
  const verifyCsrf = (req: FastifyRequest, reply: FastifyReply) => app.verifyCsrf(req, reply);
  const checkPermission = (permission: string) => (req: FastifyRequest, reply: FastifyReply) =>
    app.checkPermission(permission)(req, reply);

  // Plugins
  app.get(
    "/plugins",
    {
      preHandler: [authenticate, checkPermission(SYSTEM_PERMISSIONS.PLUGINS_READ)],
    },
    controller.listPlugins.bind(controller),
  );

  app.put(
    "/plugins/:name",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(SYSTEM_PERMISSIONS.PLUGINS_WRITE)],
    },
    controller.togglePlugin.bind(controller),
  );

  // Settings
  // GET is public (unauthenticated SSR branding & theme evaluation)
  app.get("/settings", controller.getSettings.bind(controller));

  app.put(
    "/settings",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(SYSTEM_PERMISSIONS.SETTINGS_WRITE)],
    },
    controller.updateSettings.bind(controller),
  );

  // Feature Flags
  // GET is public (unauthenticated SSR & client evaluation)
  app.get("/feature-flags", controller.listFeatureFlags.bind(controller));

  app.post(
    "/feature-flags",
    {
      preHandler: [
        authenticate,
        verifyCsrf,
        checkPermission(SYSTEM_PERMISSIONS.FEATURE_FLAGS_WRITE),
      ],
    },
    controller.createFeatureFlag.bind(controller),
  );

  app.put(
    "/feature-flags/:key",
    {
      preHandler: [
        authenticate,
        verifyCsrf,
        checkPermission(SYSTEM_PERMISSIONS.FEATURE_FLAGS_WRITE),
      ],
    },
    controller.updateFeatureFlag.bind(controller),
  );

  app.delete(
    "/feature-flags/:key",
    {
      preHandler: [
        authenticate,
        verifyCsrf,
        checkPermission(SYSTEM_PERMISSIONS.FEATURE_FLAGS_WRITE),
      ],
    },
    controller.deleteFeatureFlag.bind(controller),
  );

  // Audit Log (Read-Only)
  app.get(
    "/audit-log",
    {
      preHandler: [authenticate, checkPermission(SYSTEM_PERMISSIONS.AUDIT_LOG_READ)],
    },
    controller.listAuditLogs.bind(controller),
  );

  // System Stats
  app.get(
    "/system/stats",
    {
      preHandler: [authenticate],
    },
    controller.getStats.bind(controller),
  );
}
