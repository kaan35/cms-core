import { PERMISSIONS } from "@cms/core";
import type { FastifyInstance } from "fastify";
import type { AuthController } from "../controllers/AuthController.js";
import {
  AuthIdParamSchema,
  AuthSessionResponseSchema,
  LoginSchema,
  OkResponseSchema,
  RegisterSchema,
  RevokeCountResponseSchema,
  SessionsListResponseSchema,
  SessionsQuerySchema,
  SetupSchema,
  SetupStatusResponseSchema,
  UpdateAuthSettingsSchema,
  UserSingleResponseSchema,
  type AuthIdParam,
  type LoginInput,
  type RegisterInput,
  type SessionsQuery,
  type SetupInput,
  type UpdateAuthSettingsInput,
} from "../domain/auth.rules.js";

export interface AuthRouteOptions {
  registerRateLimitMax?: number;
  registerRateLimitWindow?: string;
  loginRateLimitMax?: number;
  loginRateLimitWindow?: string;
}

export function registerAuthSessionRoutes(
  app: FastifyInstance,
  authCtrl: AuthController,
  options: AuthRouteOptions = {},
): void {
  const { authenticate, checkPermission, verifyCsrf } = app;

  const registerMax = options.registerRateLimitMax ?? 10;
  const registerWindow = options.registerRateLimitWindow ?? "1 minute";
  const loginMax = options.loginRateLimitMax ?? 5;
  const loginWindow = options.loginRateLimitWindow ?? "1 minute";

  // Setup Wizard (First-admin bootstrap)
  app.get(
    "/auth/setup",
    {
      schema: {
        tags: ["Auth"],
        summary: "Check if setup wizard is required (public)",
        response: { 200: SetupStatusResponseSchema },
      },
    },
    authCtrl.getSetupStatus.bind(authCtrl),
  );

  app.post<{ Body: SetupInput }>(
    "/auth/setup",
    {
      schema: {
        tags: ["Auth"],
        summary: "Initialize root administrator account (public)",
        body: SetupSchema,
        response: { 201: AuthSessionResponseSchema },
      },
      config: {
        rateLimit: { max: registerMax, timeWindow: registerWindow },
      },
    },
    authCtrl.setup.bind(authCtrl),
  );

  // Public Auth Routes with Rate Limiting
  app.post<{ Body: RegisterInput }>(
    "/auth/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Register a new user account (public)",
        body: RegisterSchema,
        response: { 201: AuthSessionResponseSchema },
      },
      config: {
        rateLimit: { max: registerMax, timeWindow: registerWindow },
      },
    },
    authCtrl.register.bind(authCtrl),
  );

  app.post<{ Body: LoginInput }>(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Log in with email and password (public)",
        body: LoginSchema,
        response: { 200: AuthSessionResponseSchema },
      },
      config: {
        rateLimit: { max: loginMax, timeWindow: loginWindow },
      },
    },
    authCtrl.login.bind(authCtrl),
  );

  // Authenticated Auth & Session Routes
  app.post(
    "/auth/logout",
    {
      schema: {
        tags: ["Auth"],
        summary: "Log out current session and clear cookies",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        response: { 200: OkResponseSchema },
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
        response: { 200: UserSingleResponseSchema },
      },
      preHandler: [authenticate],
    },
    authCtrl.me.bind(authCtrl),
  );

  app.get<{ Querystring: SessionsQuery }>(
    "/auth/sessions",
    {
      schema: {
        tags: ["Auth"],
        summary: "List active sessions for current user",
        security: [{ cookieAuth: [] }],
        querystring: SessionsQuerySchema,
        response: { 200: SessionsListResponseSchema },
      },
      preHandler: [authenticate],
    },
    authCtrl.listSessions.bind(authCtrl),
  );

  app.delete<{ Params: AuthIdParam }>(
    "/auth/sessions/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke specific user session",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: AuthIdParamSchema,
        response: { 200: OkResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf],
    },
    authCtrl.deleteSession.bind(authCtrl),
  );

  // Auth Settings
  app.get(
    "/auth/settings",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get registration enabled/disabled setting",
        security: [{ cookieAuth: [] }],
        response: { 200: UpdateAuthSettingsSchema },
      },
      preHandler: [authenticate],
    },
    authCtrl.getRegistrationSetting.bind(authCtrl),
  );

  app.put<{ Body: UpdateAuthSettingsInput }>(
    "/auth/settings",
    {
      schema: {
        tags: ["Auth"],
        summary: "Toggle public registration (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: UpdateAuthSettingsSchema,
        response: { 200: UpdateAuthSettingsSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.AUTH_SETTINGS_WRITE)],
    },
    authCtrl.updateRegistrationSetting.bind(authCtrl),
  );

  // Panic Button / System-Wide Revocation
  app.post(
    "/auth/sessions/revoke-all",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke all active sessions across entire platform (Emergency Panic / Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        response: { 200: RevokeCountResponseSchema },
      },
      preHandler: [
        authenticate,
        verifyCsrf,
        checkPermission(PERMISSIONS.AUTH.AUTH_REVOKE_ALL_SESSIONS),
      ],
    },
    authCtrl.revokeAllSessions.bind(authCtrl),
  );
}
