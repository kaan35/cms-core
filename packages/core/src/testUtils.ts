import type { FastifyInstance, FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "./errors/AppError.js";

/**
 * Shared test decorator for Fastify functional test suites.
 * Injects standard authenticate, verifyCsrf, and checkPermission decorators.
 */
export function decorateTestAuth(app: FastifyInstance, defaultUserId = "test-user-1"): void {
  app.decorate("authenticate", async (req: FastifyRequest) => {
    const userId = req.headers["x-test-user"] ? String(req.headers["x-test-user"]) : undefined;
    if (!userId && !req.headers["x-test-perms"] && !req.headers["x-authenticated"]) {
      throw new UnauthorizedError("Unauthorized");
    }
    const perms = req.headers["x-test-perms"]
      ? String(req.headers["x-test-perms"])
          .split(",")
          .map((p) => p.trim())
      : [];
    req.user = {
      id: userId || defaultUserId,
      email: "test@example.com",
      permissions: perms,
      sessionId: "session-test-1",
    };
  });

  app.decorate("verifyCsrf", async () => {});

  app.decorate("checkPermission", (requiredPerm: string) => {
    return async (req: FastifyRequest) => {
      if (!req.user?.permissions?.includes(requiredPerm) && !req.user?.permissions?.includes("*")) {
        throw new ForbiddenError("Forbidden");
      }
    };
  });
}
