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
  app.get(
    "/auth/setup",
    {
      schema: {
        tags: ["Auth"],
        summary: "Check if setup wizard is required (public)",
      },
    },
    authCtrl.getSetupStatus.bind(authCtrl),
  );

  app.post(
    "/auth/setup",
    {
      schema: {
        tags: ["Auth"],
        summary: "Initialize root administrator account (public)",
      },
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
      schema: {
        tags: ["Auth"],
        summary: "Register a new user account (public)",
      },
      config: {
        rateLimit: { max: registerMax, timeWindow: registerWindow },
      },
    },
    authCtrl.register.bind(authCtrl),
  );

  app.post(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Log in with email and password (public)",
      },
      config: {
        rateLimit: { max: loginMax, timeWindow: loginWindow },
      },
    },
    authCtrl.login.bind(authCtrl),
  );

  // 3. Authenticated Auth & Session Routes
  app.post(
    "/auth/logout",
    {
      schema: {
        tags: ["Auth"],
        summary: "Log out current session and clear cookies",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf],
    },
    authCtrl.logout.bind(authCtrl),
  );

  app.get(
    "/auth/me",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get current authenticated user profile and permissions",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate],
    },
    authCtrl.me.bind(authCtrl),
  );

  app.get(
    "/auth/sessions",
    {
      schema: {
        tags: ["Auth"],
        summary: "List active sessions for current user",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate],
    },
    authCtrl.listSessions.bind(authCtrl),
  );

  app.delete(
    "/auth/sessions/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke specific user session",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf],
    },
    authCtrl.deleteSession.bind(authCtrl),
  );

  // 4. Auth Settings
  app.get(
    "/auth/settings",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get registration enabled/disabled setting",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate],
    },
    authCtrl.getRegistrationSetting.bind(authCtrl),
  );

  app.put(
    "/auth/settings",
    {
      schema: {
        tags: ["Auth"],
        summary: "Toggle public registration (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.AUTH_SETTINGS_WRITE)],
    },
    authCtrl.updateRegistrationSetting.bind(authCtrl),
  );

  // 5. User Session Revocation (Admin)
  app.delete(
    "/users/:id/sessions",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke all sessions for a specific user (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    authCtrl.revokeAllUserSessions.bind(authCtrl),
  );

  app.post(
    "/auth/sessions/revoke-all",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke all active sessions across entire platform (Emergency Panic / Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
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
    {
      schema: {
        tags: ["Auth"],
        summary: "List all users (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.USERS_READ)],
    },
    userCtrl.listUsers.bind(userCtrl),
  );

  app.get(
    "/users/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get user details by ID (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.USERS_READ)],
    },
    userCtrl.getUserById.bind(userCtrl),
  );

  app.post(
    "/users",
    {
      schema: {
        tags: ["Auth"],
        summary: "Create a new user account (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    userCtrl.createUser.bind(userCtrl),
  );

  app.put(
    "/users/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Update user profile or roles (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    userCtrl.updateUser.bind(userCtrl),
  );

  app.delete(
    "/users/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Delete a user account (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    userCtrl.deleteUser.bind(userCtrl),
  );

  // 7. Role Management
  app.get(
    "/roles",
    {
      schema: {
        tags: ["Auth"],
        summary: "List all roles and permission sets (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.ROLES_READ)],
    },
    roleCtrl.listRoles.bind(roleCtrl),
  );

  app.get(
    "/roles/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get role details by ID (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.ROLES_READ)],
    },
    roleCtrl.getRoleById.bind(roleCtrl),
  );

  app.post(
    "/roles",
    {
      schema: {
        tags: ["Auth"],
        summary: "Create a new RBAC role (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)],
    },
    roleCtrl.createRole.bind(roleCtrl),
  );

  app.put(
    "/roles/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Update role permissions (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)],
    },
    roleCtrl.updateRole.bind(roleCtrl),
  );

  app.delete(
    "/roles/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Delete a role (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)],
    },
    roleCtrl.deleteRole.bind(roleCtrl),
  );
}
