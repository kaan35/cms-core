import type { CoreServices } from "@cms/core";
import type { FastifyInstance } from "fastify";
import { AuthController } from "./authController.js";
import { AuthService } from "./authService.js";
import { createAuthenticateMiddleware } from "./middleware/authenticate.js";
import { createCheckPermissionMiddleware } from "./middleware/checkPermission.js";
import { createVerifyCsrfMiddleware } from "./middleware/verifyCsrf.js";
import { RolesRepository } from "./repositories/rolesRepository.js";
import { SessionsRepository } from "./repositories/sessionsRepository.js";
import { UsersRepository } from "./repositories/usersRepository.js";
import { SessionService } from "./sessionService.js";

export { AuthController } from "./authController.js";
export { AuthService } from "./authService.js";
export type { AuthResult } from "./authService.js";

export {
  getDefaultPasswordMinLength,
  getDefaultSaltRounds,
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "./domain/password.rules.js";
export { ADMIN_ROLE_NAME, AUTH_PERMISSIONS, hasPermission } from "./domain/permission.rules.js";
export { initAuthMigration } from "./migrations/202601010000_init_auth.js";
export { RolesRepository } from "./repositories/rolesRepository.js";
export type { RoleDoc } from "./repositories/rolesRepository.js";
export { SessionsRepository } from "./repositories/sessionsRepository.js";
export type { SessionDoc } from "./repositories/sessionsRepository.js";
export { UsersRepository } from "./repositories/usersRepository.js";
export type { UserDoc } from "./repositories/usersRepository.js";
export { SessionService } from "./sessionService.js";

export async function registerAuthPlugin(
  app: FastifyInstance,
  services: CoreServices,
): Promise<void> {
  const { db, logger, config, hooks, settings } = services;

  const usersRepo = new UsersRepository(db);
  const rolesRepo = new RolesRepository(db);
  const sessionsRepo = new SessionsRepository(db);

  const jwtSecret = config.getOrDefault(
    "JWT_SECRET",
    "cms-dev-jwt-secret-min-32-chars-long-please-change-in-prod",
  );
  const isProduction = config.getOrDefault("NODE_ENV", "development") === "production";
  const saltRounds = config.getInt("BCRYPT_SALT_ROUNDS", 12);
  const passwordMinLength = config.getInt("PASSWORD_MIN_LENGTH", 8);
  const sessionTtlHours = config.getInt("SESSION_TTL_HOURS", 24);
  const slideThresholdMinutes = config.getInt("SESSION_SLIDE_THRESHOLD_MINUTES", 15);
  const setupEnabled = config.getBoolean("SETUP_ENABLED", true);

  const sessionService = new SessionService(
    sessionsRepo,
    jwtSecret,
    logger,
    sessionTtlHours,
    slideThresholdMinutes,
  );

  const authenticate = createAuthenticateMiddleware(sessionService, usersRepo);
  const checkPermission = createCheckPermissionMiddleware();
  const verifyCsrf = createVerifyCsrfMiddleware();

  if (!app.hasDecorator("authenticate")) {
    app.decorate("authenticate", authenticate);
  }
  if (!app.hasDecorator("checkPermission")) {
    app.decorate("checkPermission", checkPermission);
  }
  if (!app.hasDecorator("verifyCsrf")) {
    app.decorate("verifyCsrf", verifyCsrf);
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

  const controller = new AuthController(
    authService,
    isProduction,
    cookieDomain,
    cookieSameSite,
    cookieSecure,
  );

  const registerRateLimitMax = config.getInt("RATE_LIMIT_REGISTER_MAX", 10);
  const registerRateLimitWindow = config.getOrDefault(
    "RATE_LIMIT_REGISTER_TIME_WINDOW",
    "1 minute",
  );
  const loginRateLimitMax = config.getInt("RATE_LIMIT_LOGIN_MAX", 5);
  const loginRateLimitWindow = config.getOrDefault("RATE_LIMIT_LOGIN_TIME_WINDOW", "1 minute");

  const { registerAuthRoutes } = await import("./routes.js");
  registerAuthRoutes(app, controller, {
    registerRateLimitMax,
    registerRateLimitWindow,
    loginRateLimitMax,
    loginRateLimitWindow,
  });
}
