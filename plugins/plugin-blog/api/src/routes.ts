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
  app.get(
    "/blog/search",
    {
      schema: {
        tags: ["Blog"],
        summary: "Search published blog posts (public)",
      },
      preHandler: [optionalAuth],
    },
    controller.search.bind(controller),
  );

  app.get(
    "/blog",
    {
      schema: {
        tags: ["Blog"],
        summary: "List blog articles with pagination (public)",
      },
      preHandler: [optionalAuth],
    },
    controller.list.bind(controller),
  );

  app.get(
    "/blog/:slug",
    {
      schema: {
        tags: ["Blog"],
        summary: "Get single blog article by URL slug (public)",
      },
      preHandler: [optionalAuth],
    },
    controller.getBySlug.bind(controller),
  );

  // 2. Authenticated Admin routes (with 🔒 security definitions)
  app.post(
    "/blog",
    {
      schema: {
        tags: ["Blog"],
        summary: "Create a new blog article (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.create.bind(controller),
  );

  app.put(
    "/blog/:id",
    {
      schema: {
        tags: ["Blog"],
        summary: "Update an existing blog article (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.update.bind(controller),
  );

  app.delete(
    "/blog/:id",
    {
      schema: {
        tags: ["Blog"],
        summary: "Delete a blog article and capture redirect (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.deleteById.bind(controller),
  );

  app.get(
    "/blog/:id/versions",
    {
      schema: {
        tags: ["Blog"],
        summary: "Get version snapshot history for a blog article (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.getVersions.bind(controller),
  );
}
