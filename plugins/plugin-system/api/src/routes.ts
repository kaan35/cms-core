import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SYSTEM_PERMISSIONS } from "./domain/system.rules.js";
import type { SystemController } from "./systemController.js";

export function registerSystemRoutes(app: FastifyInstance, controller: SystemController): void {
  const customApp = app as unknown as {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyCsrf: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    checkPermission: (
      permission: string,
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  };
  const authenticate = (req: FastifyRequest, reply: FastifyReply) =>
    customApp.authenticate(req, reply);
  const verifyCsrf = (req: FastifyRequest, reply: FastifyReply) => customApp.verifyCsrf(req, reply);
  const checkPermission = (permission: string) => (req: FastifyRequest, reply: FastifyReply) =>
    customApp.checkPermission(permission)(req, reply);

  // Plugins
  app.get(
    "/plugins",
    {
      schema: {
        tags: ["System"],
        summary: "List all plugins and their runtime status (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(SYSTEM_PERMISSIONS.PLUGINS_READ)],
    },
    controller.listPlugins.bind(controller),
  );

  app.put(
    "/plugins/:name",
    {
      schema: {
        tags: ["System"],
        summary: "Toggle plugin enabled/disabled state (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(SYSTEM_PERMISSIONS.PLUGINS_WRITE)],
    },
    controller.togglePlugin.bind(controller),
  );

  // Settings
  // GET is public (unauthenticated SSR branding & theme evaluation)
  app.get(
    "/settings",
    {
      schema: {
        tags: ["System"],
        summary: "Get public site settings, menus, and branding (public)",
      },
    },
    controller.getSettings.bind(controller),
  );

  app.put(
    "/settings",
    {
      schema: {
        tags: ["System"],
        summary: "Update site settings and navigation menus (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(SYSTEM_PERMISSIONS.SETTINGS_WRITE)],
    },
    controller.updateSettings.bind(controller),
  );

  // Feature Flags
  // GET is public (unauthenticated SSR & client evaluation)
  app.get(
    "/feature-flags",
    {
      schema: {
        tags: ["System"],
        summary: "Get public feature flags evaluation (public)",
      },
    },
    controller.listFeatureFlags.bind(controller),
  );

  app.post(
    "/feature-flags",
    {
      schema: {
        tags: ["System"],
        summary: "Create a new feature flag (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
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
      schema: {
        tags: ["System"],
        summary: "Update feature flag value (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
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
      schema: {
        tags: ["System"],
        summary: "Delete a feature flag (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
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
      schema: {
        tags: ["System"],
        summary: "List platform audit logs (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(SYSTEM_PERMISSIONS.AUDIT_LOG_READ)],
    },
    controller.listAuditLogs.bind(controller),
  );

  // System Stats
  app.get(
    "/system/stats",
    {
      schema: {
        tags: ["System"],
        summary: "Get system runtime statistics (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate],
    },
    controller.getStats.bind(controller),
  );
}
