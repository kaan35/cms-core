import { PERMISSIONS } from "@cms/core";
import type { FastifyInstance } from "fastify";
import type { AuthController } from "../controllers/AuthController.js";
import type { UserController } from "../controllers/UserController.js";

export function registerUserRoutes(
  app: FastifyInstance,
  userCtrl: UserController,
  authCtrl: AuthController,
): void {
  const { authenticate, checkPermission, verifyCsrf } = app;

  // Admin User Session Revocation
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

  // User Management
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
}
