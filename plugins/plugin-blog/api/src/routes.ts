import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { BlogPostController } from "./blogPostController.js";
import { BLOG_PERMISSIONS } from "./domain/blogPost.rules.js";

export function registerBlogRoutes(app: FastifyInstance, controller: BlogPostController): void {
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
  app.get("/blog/search", { preHandler: [optionalAuth] }, controller.search.bind(controller));
  app.get("/blog", { preHandler: [optionalAuth] }, controller.list.bind(controller));
  app.get("/blog/:slug", { preHandler: [optionalAuth] }, controller.getBySlug.bind(controller));

  // 2. Authenticated Admin routes
  app.post(
    "/blog",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.create.bind(controller),
  );

  app.put(
    "/blog/:id",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.update.bind(controller),
  );

  app.delete(
    "/blog/:id",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.deleteById.bind(controller),
  );

  app.get(
    "/blog/:id/versions",
    {
      preHandler: [authenticate, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.getVersions.bind(controller),
  );
}
