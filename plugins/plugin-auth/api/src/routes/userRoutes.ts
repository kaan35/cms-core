import { PERMISSIONS } from "@cms/core";
import type { FastifyInstance } from "fastify";
import type { AuthController } from "../controllers/AuthController.js";
import type { UserController } from "../controllers/UserController.js";
import {
  AuthIdParamSchema,
  CreateUserSchema,
  OkResponseSchema,
  SessionsListResponseSchema,
  UpdateUserSchema,
  UserListResponseSchema,
  UserSessionParamSchema,
  UserSingleResponseSchema,
  UsersQuerySchema,
  type AuthIdParam,
  type CreateUserInput,
  type UpdateUserInput,
  type UserSessionParam,
  type UsersQuery,
} from "../domain/auth.rules.js";

export function registerUserRoutes(
  app: FastifyInstance,
  userCtrl: UserController,
  _authCtrl: AuthController,
): void {
  const { authenticate, checkPermission, verifyCsrf } = app;

  // Admin User Sessions Management
  app.get<{ Params: AuthIdParam }>(
    "/users/:id/sessions",
    {
      schema: {
        tags: ["Auth"],
        summary: "List all active and past sessions for a user (Admin)",
        security: [{ cookieAuth: [] }],
        params: AuthIdParamSchema,
        response: { 200: SessionsListResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.USERS_READ)],
    },
    userCtrl.listUserSessions.bind(userCtrl),
  );

  app.delete<{ Params: UserSessionParam }>(
    "/users/:id/sessions/:sessionId",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke a specific session for a user (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: UserSessionParamSchema,
        response: { 200: OkResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    userCtrl.revokeUserSession.bind(userCtrl),
  );

  app.post<{ Params: AuthIdParam }>(
    "/users/:id/sessions/revoke-all",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke all active sessions for a specific user (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: AuthIdParamSchema,
        response: { 200: OkResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    userCtrl.revokeAllUserSessions.bind(userCtrl),
  );

  // Backward compatible DELETE /users/:id/sessions
  app.delete<{ Params: AuthIdParam }>(
    "/users/:id/sessions",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke all sessions for a specific user (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: AuthIdParamSchema,
        response: { 200: OkResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    userCtrl.revokeAllUserSessions.bind(userCtrl),
  );

  // User Management
  app.get<{ Querystring: UsersQuery }>(
    "/users",
    {
      schema: {
        tags: ["Auth"],
        summary: "List all users (Admin)",
        security: [{ cookieAuth: [] }],
        querystring: UsersQuerySchema,
        response: { 200: UserListResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.USERS_READ)],
    },
    userCtrl.listUsers.bind(userCtrl),
  );

  app.get<{ Params: AuthIdParam }>(
    "/users/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get user details by ID (Admin)",
        security: [{ cookieAuth: [] }],
        params: AuthIdParamSchema,
        response: { 200: UserSingleResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.USERS_READ)],
    },
    userCtrl.getUserById.bind(userCtrl),
  );

  app.post<{ Body: CreateUserInput }>(
    "/users",
    {
      schema: {
        tags: ["Auth"],
        summary: "Create a new user account (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: CreateUserSchema,
        response: { 201: UserSingleResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    userCtrl.createUser.bind(userCtrl),
  );

  app.put<{ Params: AuthIdParam; Body: UpdateUserInput }>(
    "/users/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Update user profile or roles (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: AuthIdParamSchema,
        body: UpdateUserSchema,
        response: { 200: UserSingleResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    userCtrl.updateUser.bind(userCtrl),
  );

  app.delete<{ Params: AuthIdParam }>(
    "/users/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Delete a user account (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: AuthIdParamSchema,
        response: { 200: OkResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.USERS_WRITE)],
    },
    userCtrl.deleteUser.bind(userCtrl),
  );
}
