import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AuditLogListResponseSchema,
  AuditLogQuerySchema,
  PluginNameParamSchema,
  PluginsListResponseSchema,
  SYSTEM_PERMISSIONS,
  SettingsResponseSchema,
  SystemStatsResponseSchema,
  TogglePluginResponseSchema,
  TogglePluginSchema,
  UpdateSettingsSchema,
  type AuditLogQuery,
  type PluginNameParam,
  type TogglePluginInput,
  type UpdateSettingsInput,
} from "./domain/system.rules.js";
import type { SystemController } from "./systemController.js";

export function registerSystemRoutes(app: FastifyInstance, controller: SystemController): void {
  const authenticate = (req: FastifyRequest, reply: FastifyReply) =>
    typeof app.authenticate === "function" ? app.authenticate(req, reply) : Promise.resolve();
  const verifyCsrf = (req: FastifyRequest, reply: FastifyReply) =>
    typeof app.verifyCsrf === "function" ? app.verifyCsrf(req, reply) : Promise.resolve();
  const checkPermission = (permission: string) => (req: FastifyRequest, reply: FastifyReply) =>
    typeof app.checkPermission === "function"
      ? app.checkPermission(permission)(req, reply)
      : Promise.resolve();

  // Plugins
  app.get(
    "/plugins",
    {
      schema: {
        tags: ["System"],
        summary: "List all plugins and their runtime status (Authenticated)",
        security: [{ cookieAuth: [] }],
        response: { 200: PluginsListResponseSchema },
      },
      preHandler: [authenticate],
    },
    controller.listPlugins.bind(controller),
  );

  app.put<{ Params: PluginNameParam; Body: TogglePluginInput }>(
    "/plugins/:name",
    {
      schema: {
        tags: ["System"],
        summary: "Toggle plugin enabled/disabled state (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: PluginNameParamSchema,
        body: TogglePluginSchema,
        response: { 200: TogglePluginResponseSchema },
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
        response: { 200: SettingsResponseSchema },
      },
    },
    controller.getSettings.bind(controller),
  );

  app.put<{ Body: UpdateSettingsInput }>(
    "/settings",
    {
      schema: {
        tags: ["System"],
        summary: "Update site settings and navigation menus (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: UpdateSettingsSchema,
        response: { 200: SettingsResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(SYSTEM_PERMISSIONS.SETTINGS_WRITE)],
    },
    controller.updateSettings.bind(controller),
  );

  // Audit Log (Read-Only)
  app.get<{ Querystring: AuditLogQuery }>(
    "/audit-log",
    {
      schema: {
        tags: ["System"],
        summary: "List platform audit logs",
        security: [{ cookieAuth: [] }],
        querystring: AuditLogQuerySchema,
        response: { 200: AuditLogListResponseSchema },
      },
      preHandler: [authenticate],
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
        response: { 200: SystemStatsResponseSchema },
      },
      preHandler: [authenticate],
    },
    controller.getStats.bind(controller),
  );
}
