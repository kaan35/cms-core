import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Shared test decorator for Fastify functional test suites.
 * Injects standard authenticate, verifyCsrf, and checkPermission decorators.
 */
export function decorateTestAuth(app: FastifyInstance, defaultUserId = "test-user-1"): void {
  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.headers["x-test-user"] ? String(req.headers["x-test-user"]) : undefined;
    if (!userId && !req.headers["x-test-perms"] && !req.headers["x-authenticated"]) {
      return reply.status(401).send({ error: "Unauthorized" });
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
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user?.permissions.includes(requiredPerm)) {
        return reply.status(403).send({ error: "Forbidden" });
      }
    };
  });
}
