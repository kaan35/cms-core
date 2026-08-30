import { PERMISSIONS } from "@cms/core";
import type { FastifyInstance } from "fastify";
import type { AuthController } from "./controllers/AuthController.js";
import type { RoleController } from "./controllers/RoleController.js";
import type { UserController } from "./controllers/UserController.js";

export interface AuthRouteOptions {
  registerRateLimitMax?: number;
  registerRateLimitWindow?: string;
  loginRateLimitMax?: number;
  loginRateLimitWindow?: string;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  controllers:
    | {
        auth: AuthController;
        user: UserController;
        role: RoleController;
      }
    | AuthController,
  options: AuthRouteOptions = {},
): void {
  const { authenticate, checkPermission, verifyCsrf } = app;

  const authCtrl = "auth" in controllers ? controllers.auth : controllers;
  const userCtrl =
    "user" in controllers ? controllers.user : (controllers as unknown as UserController);
  const roleCtrl =
    "role" in controllers ? controllers.role : (controllers as unknown as RoleController);

  const registerMax = options.registerRateLimitMax ?? 10;
  const registerWindow = options.registerRateLimitWindow ?? "1 minute";
  const loginMax = options.loginRateLimitMax ?? 5;
  const loginWindow = options.loginRateLimitWindow ?? "1 minute";

  // 1. Setup Wizard (First-admin bootstrap)
  app.get("/auth/setup", authCtrl.getSetupStatus.bind(authCtrl));
  app.post(
    "/auth/setup",
    {
      config: {
        rateLimit: { max: registerMax, timeWindow: registerWindow },
      },
    },
    authCtrl.setup.bind(authCtrl),
  );

  // 2. Public Auth Routes with Rate Limiting
  app.post(
    "/auth/register",
    {
      config: {
        rateLimit: { max: registerMax, timeWindow: registerWindow },
      },
    },
    authCtrl.register.bind(authCtrl),
  );

  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: { max: loginMax, timeWindow: loginWindow },
      },
    },
    authCtrl.login.bind(authCtrl),
  );

  // 3. Authenticated Auth & Session Routes
  app.post(
    "/auth/logout",
    { preHandler: [authenticate, verifyCsrf] },
    authCtrl.logout.bind(authCtrl),
  );

  app.get("/auth/me", { preHandler: [authenticate] }, authCtrl.me.bind(authCtrl));

  app.get("/auth/sessions", { preHandler: [authenticate] }, authCtrl.listSessions.bind(authCtrl));

  app.delete(
    "/auth/sessions/:id",
    { preHandler: [authenticate, verifyCsrf] },
    authCtrl.deleteSession.bind(authCtrl),
  );

  // 4. Auth Settings
  app.get(
    "/auth/settings",
    { preHandler: [authenticate] },
    authCtrl.getRegistrationSetting.bind(authCtrl),
  );

  app.put(
    "/auth/settings",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.AUTH_SETTINGS_WRITE)],
    },
    authCtrl.updateRegistrationSetting.bind(authCtrl),
  );

  // 5. User Session Revocation (Admin)
  app.delete(
    "/users/:id/sessions",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    authCtrl.revokeAllUserSessions.bind(authCtrl),
  );

  app.post(
    "/auth/sessions/revoke-all",
    {
      preHandler: [
        authenticate,
        verifyCsrf,
        checkPermission(PERMISSIONS.AUTH.AUTH_REVOKE_ALL_SESSIONS),
      ],
    },
    authCtrl.revokeAllSessions.bind(authCtrl),
  );

  // 6. User Management
  app.get(
    "/users",
    { preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.USERS_READ)] },
    userCtrl.listUsers.bind(userCtrl),
  );

  app.get(
    "/users/:id",
    { preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.USERS_READ)] },
    userCtrl.getUserById.bind(userCtrl),
  );

  app.post(
    "/users",
    { preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)] },
    userCtrl.createUser.bind(userCtrl),
  );

  app.put(
    "/users/:id",
    { preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)] },
    userCtrl.updateUser.bind(userCtrl),
  );

  app.delete(
    "/users/:id",
    { preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)] },
    userCtrl.deleteUser.bind(userCtrl),
  );

  // 7. Role Management
  app.get(
    "/roles",
    { preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.ROLES_READ)] },
    roleCtrl.listRoles.bind(roleCtrl),
  );

  app.get(
    "/roles/:id",
    { preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.ROLES_READ)] },
    roleCtrl.getRoleById.bind(roleCtrl),
  );

  app.post(
    "/roles",
    { preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)] },
    roleCtrl.createRole.bind(roleCtrl),
  );

  app.put(
    "/roles/:id",
    { preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)] },
    roleCtrl.updateRole.bind(roleCtrl),
  );

  app.delete(
    "/roles/:id",
    { preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)] },
    roleCtrl.deleteRole.bind(roleCtrl),
  );
}
