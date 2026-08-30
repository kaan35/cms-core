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
  app.get(
    "/pages/home",
    {
      schema: {
        tags: ["Pages"],
        summary: "Get the root home page (public)",
      },
      preHandler: [optionalAuth],
    },
    controller.getHome.bind(controller),
  );

  app.get(
    "/pages/search",
    {
      schema: {
        tags: ["Pages"],
        summary: "Search published pages (public)",
      },
      preHandler: [optionalAuth],
    },
    controller.search.bind(controller),
  );

  app.get(
    "/pages",
    {
      schema: {
        tags: ["Pages"],
        summary: "List pages with pagination and filters",
      },
      preHandler: [optionalAuth],
    },
    controller.list.bind(controller),
  );

  app.get(
    "/pages/:slug",
    {
      schema: {
        tags: ["Pages"],
        summary: "Get page by URL slug (public)",
      },
      preHandler: [optionalAuth],
    },
    controller.getBySlug.bind(controller),
  );

  // 2. Authenticated Admin routes (with 🔒 security definitions)
  app.post(
    "/pages",
    {
      schema: {
        tags: ["Pages"],
        summary: "Create a new page (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.create.bind(controller),
  );

  app.put(
    "/pages/:id",
    {
      schema: {
        tags: ["Pages"],
        summary: "Update an existing page (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.update.bind(controller),
  );

  app.delete(
    "/pages/:id",
    {
      schema: {
        tags: ["Pages"],
        summary: "Delete a page and capture redirect (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.deleteById.bind(controller),
  );

  app.get(
    "/pages/:id/versions",
    {
      schema: {
        tags: ["Pages"],
        summary: "Get version snapshot history for a page (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.getVersions.bind(controller),
  );
}
