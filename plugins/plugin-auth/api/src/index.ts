import type { CoreServices } from "@cms/core";
import type { FastifyInstance } from "fastify";
import { AuthController } from "./controllers/AuthController.js";
import { RoleController } from "./controllers/RoleController.js";
import { UserController } from "./controllers/UserController.js";
import { createAuthenticateMiddleware } from "./middleware/authenticate.js";
import { createCheckPermissionMiddleware } from "./middleware/checkPermission.js";
import { createVerifyCsrfMiddleware } from "./middleware/verifyCsrf.js";
import { RolesRepository } from "./repositories/rolesRepository.js";
import { SessionsRepository } from "./repositories/sessionsRepository.js";
import { UsersRepository } from "./repositories/usersRepository.js";
import { AuthService } from "./services/AuthService.js";
import { RoleService } from "./services/RoleService.js";
import { UserService } from "./services/UserService.js";
import { SessionService } from "./sessionService.js";

// Services & Controllers
export { AuthController } from "./controllers/AuthController.js";
export { RoleController } from "./controllers/RoleController.js";
export { UserController } from "./controllers/UserController.js";
export { AuthService } from "./services/AuthService.js";
export type { AuthResult } from "./services/AuthService.js";
export { RoleService } from "./services/RoleService.js";
export { UserService } from "./services/UserService.js";

// Domain & Rules
export {
  CreateRoleSchema,
  CreateUserSchema,
  EmailSchema,
  LoginSchema,
  PasswordSchema,
  RegisterSchema,
  SetupSchema,
  UpdateAuthSettingsSchema,
  UpdateRoleSchema,
  UpdateUserSchema,
  validateCreateRole,
  validateCreateUser,
  validateLogin,
  validateRegister,
  validateSetup,
  validateUpdateAuthSettings,
  validateUpdateRole,
  validateUpdateUser,
} from "./domain/auth.rules.js";
export type {
  CreateRoleInput,
  CreateUserInput,
  LoginInput,
  RegisterInput,
  SetupInput,
  UpdateAuthSettingsInput,
  UpdateRoleInput,
  UpdateUserInput,
} from "./domain/auth.rules.js";
export {
  getDefaultPasswordMinLength,
  getDefaultSaltRounds,
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "./domain/password.rules.js";
export { ADMIN_ROLE_NAME, AUTH_PERMISSIONS, hasPermission } from "./domain/permission.rules.js";

// Repositories & Migrations
export { initAuthMigration } from "./migrations/202601010000_init_auth.js";
export { RolesRepository } from "./repositories/rolesRepository.js";
export type { RoleDoc } from "./repositories/rolesRepository.js";
export { SessionsRepository } from "./repositories/sessionsRepository.js";
export type { SessionDoc } from "./repositories/sessionsRepository.js";
export { UsersRepository } from "./repositories/usersRepository.js";
export type { UserDoc } from "./repositories/usersRepository.js";
export { SessionService, type ISessionService, type ISessionInfo } from "./sessionService.js";

export async function registerAuthPlugin(
  app: FastifyInstance,
  services: CoreServices,
): Promise<void> {
  const { db, logger, config, hooks, settings } = services;

  const usersRepo = new UsersRepository(db);
  const rolesRepo = new RolesRepository(db);
  const sessionsRepo = new SessionsRepository(db);

  const jwtSecret = config.getOrDefault("JWT_SECRET", "") || process.env["JWT_SECRET"] || "";

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET is required and must be at least 32 characters long. Boot failed.");
  }
  const isProduction = config.getOrDefault("NODE_ENV", "development") === "production";
  const saltRounds = config.getInt("BCRYPT_SALT_ROUNDS", 12);
  const passwordMinLength = config.getInt("PASSWORD_MIN_LENGTH", 8);
  const sessionTtlHours = config.getInt("SESSION_TTL_HOURS", 24);
  const slideThresholdMinutes = config.getInt("SESSION_SLIDE_THRESHOLD_MINUTES", 15);
  const setupEnabled = config.getBoolean("SETUP_ENABLED", true);
  const cookiePrefix = config.getOrDefault("COOKIE_PREFIX", "");

  const sessionService = new SessionService(
    sessionsRepo,
    jwtSecret,
    logger,
    sessionTtlHours,
    slideThresholdMinutes,
  );

  const authenticate = createAuthenticateMiddleware(
    sessionService,
    usersRepo,
    rolesRepo,
    cookiePrefix,
  );
  const checkPermission = createCheckPermissionMiddleware();
  const verifyCsrf = createVerifyCsrfMiddleware(cookiePrefix);

  const customApp = app as unknown as {
    setAuthMiddlewares?: (middlewares: Record<string, unknown>) => void;
  };
  if (typeof customApp.setAuthMiddlewares === "function") {
    customApp.setAuthMiddlewares({ authenticate, checkPermission, verifyCsrf });
  } else {
    if (app.hasDecorator("authenticate")) {
      app.authenticate = authenticate;
    } else {
      app.decorate("authenticate", authenticate);
    }

    if (app.hasDecorator("checkPermission")) {
      app.checkPermission = checkPermission;
    } else {
      app.decorate("checkPermission", checkPermission);
    }

    if (app.hasDecorator("verifyCsrf")) {
      app.verifyCsrf = verifyCsrf;
    } else {
      app.decorate("verifyCsrf", verifyCsrf);
    }
  }

  const cookieDomain = config.getOrDefault("COOKIE_DOMAIN", "") || undefined;
  const cookieSameSiteRaw = config.getOrDefault("COOKIE_SAME_SITE", "lax");
  const cookieSameSite = (
    ["lax", "strict", "none"].includes(cookieSameSiteRaw) ? cookieSameSiteRaw : "lax"
  ) as "lax" | "strict" | "none";
  const cookieSecure =
    config.getOrDefault("COOKIE_SECURE", "") !== ""
      ? config.getBoolean("COOKIE_SECURE", false)
      : isProduction;

  const authService = new AuthService(
    usersRepo,
    rolesRepo,
    sessionsRepo,
    sessionService,
    settings,
    hooks,
    logger,
    saltRounds,
    passwordMinLength,
    setupEnabled,
  );
  const userService = new UserService(
    usersRepo,
    rolesRepo,
    sessionsRepo,
    hooks,
    logger,
    saltRounds,
  );
  const roleService = new RoleService(rolesRepo, usersRepo, hooks, logger);

  const authController = new AuthController(
    authService,
    isProduction,
    cookieDomain,
    cookieSameSite,
    cookieSecure,
    cookiePrefix,
  );
  const userController = new UserController(userService);
  const roleController = new RoleController(roleService);

  const registerRateLimitMax = config.getInt("RATE_LIMIT_REGISTER_MAX", 10);
  const registerRateLimitWindow = config.getOrDefault(
    "RATE_LIMIT_REGISTER_TIME_WINDOW",
    "1 minute",
  );
  const loginRateLimitMax = config.getInt("RATE_LIMIT_LOGIN_MAX", 5);
  const loginRateLimitWindow = config.getOrDefault("RATE_LIMIT_LOGIN_TIME_WINDOW", "1 minute");

  const { registerAuthRoutes } = await import("./routes.js");
  registerAuthRoutes(
    app,
    {
      auth: authController,
      user: userController,
      role: roleController,
    },
    {
      registerRateLimitMax,
      registerRateLimitWindow,
      loginRateLimitMax,
      loginRateLimitWindow,
    },
  );
}
