import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { PAGES_PERMISSIONS } from "./domain/page.rules.js";
import type { PageController } from "./pageController.js";

export function registerPageRoutes(app: FastifyInstance, controller: PageController): void {
  const authenticate = (req: FastifyRequest, reply: FastifyReply) => app.authenticate(req, reply);
  const verifyCsrf = (req: FastifyRequest, reply: FastifyReply) => app.verifyCsrf(req, reply);
  const checkPermission = (permission: string) => (req: FastifyRequest, reply: FastifyReply) =>
    app.checkPermission(permission)(req, reply);

  const optionalAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await app.authenticate(req, reply);
    } catch {
      // Unauthenticated / public visitor
    }
  };

  // 1. Public / Optional-auth routes
  app.get("/pages/home", { preHandler: [optionalAuth] }, controller.getHome.bind(controller));
  app.get("/pages/search", { preHandler: [optionalAuth] }, controller.search.bind(controller));
  app.get("/pages", { preHandler: [optionalAuth] }, controller.list.bind(controller));
  app.get("/pages/:slug", { preHandler: [optionalAuth] }, controller.getBySlug.bind(controller));

  // 2. Authenticated Admin routes
  app.post(
    "/pages",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.create.bind(controller),
  );

  app.put(
    "/pages/:id",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.update.bind(controller),
  );

  app.delete(
    "/pages/:id",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.deleteById.bind(controller),
  );

  app.get(
    "/pages/:id/versions",
    {
      preHandler: [authenticate, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.getVersions.bind(controller),
  );
}
