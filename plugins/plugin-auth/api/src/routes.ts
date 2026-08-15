import type { FastifyInstance } from "fastify";
import type { AuthController } from "./authController.js";
import { AUTH_PERMISSIONS } from "./domain/permission.rules.js";

export interface AuthRouteOptions {
  registerRateLimitMax?: number;
  registerRateLimitWindow?: string;
  loginRateLimitMax?: number;
  loginRateLimitWindow?: string;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  controller: AuthController,
  options: AuthRouteOptions = {},
): void {
  const { authenticate, checkPermission, verifyCsrf } = app;

  const registerMax = options.registerRateLimitMax ?? 10;
  const registerWindow = options.registerRateLimitWindow ?? "1 minute";
  const loginMax = options.loginRateLimitMax ?? 5;
  const loginWindow = options.loginRateLimitWindow ?? "1 minute";

  // Setup wizard routes (First-admin bootstrap)
  app.get("/auth/setup", controller.getSetupStatus.bind(controller));

  app.post(
    "/auth/setup",
    {
      config: {
        rateLimit: {
          max: registerMax,
          timeWindow: registerWindow,
        },
      },
    },
    controller.setup.bind(controller),
  );

  // Public routes with dedicated rate limits
  app.post(
    "/auth/register",
    {
      config: {
        rateLimit: {
          max: registerMax,
          timeWindow: registerWindow,
        },
      },
    },
    controller.register.bind(controller),
  );

  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: {
          max: loginMax,
          timeWindow: loginWindow,
        },
      },
    },
    controller.login.bind(controller),
  );

  // Authenticated routes with CSRF verification on state changes
  app.post(
    "/auth/logout",
    { preHandler: [authenticate, verifyCsrf] },
    controller.logout.bind(controller),
  );

  app.get("/auth/me", { preHandler: [authenticate] }, controller.me.bind(controller));

  app.get(
    "/auth/sessions",
    { preHandler: [authenticate] },
    controller.listSessions.bind(controller),
  );

  app.delete(
    "/auth/sessions/:id",
    { preHandler: [authenticate, verifyCsrf] },
    controller.deleteSession.bind(controller),
  );

  // Settings
  app.get(
    "/auth/settings",
    { preHandler: [authenticate] },
    controller.getSettings.bind(controller),
  );

  app.put(
    "/auth/settings",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(AUTH_PERMISSIONS.AUTH_SETTINGS_WRITE)],
    },
    controller.updateSettings.bind(controller),
  );

  // User session management (admin)
  app.delete(
    "/users/:id/sessions",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(AUTH_PERMISSIONS.USERS_WRITE)],
    },
    controller.revokeUserSessions.bind(controller),
  );

  // Revoke all sessions system-wide
  app.post(
    "/auth/sessions/revoke-all",
    {
      preHandler: [
        authenticate,
        verifyCsrf,
        checkPermission(AUTH_PERMISSIONS.AUTH_REVOKE_ALL_SESSIONS),
      ],
    },
    controller.revokeAllSessions.bind(controller),
  );

  // Users management
  app.get(
    "/users",
    {
      preHandler: [authenticate, checkPermission(AUTH_PERMISSIONS.USERS_READ)],
    },
    controller.listUsers.bind(controller),
  );

  app.post(
    "/users",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(AUTH_PERMISSIONS.USERS_WRITE)],
    },
    controller.createUser.bind(controller),
  );

  // Roles management
  app.get(
    "/roles",
    {
      preHandler: [authenticate, checkPermission(AUTH_PERMISSIONS.ROLES_READ)],
    },
    controller.listRoles.bind(controller),
  );

  app.post(
    "/roles",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(AUTH_PERMISSIONS.ROLES_WRITE)],
    },
    controller.createRole.bind(controller),
  );
}
