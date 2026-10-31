import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { BlogPostController } from "./blogPostController.js";
import {
  BLOG_PERMISSIONS,
  BlogPostDocSchema,
  BlogPostListResponseSchema,
  BlogPostVersionsResponseSchema,
  BlogQuerySchema,
  CreateBlogPostSchema,
  PostIdParamSchema,
  PostSlugParamSchema,
  UpdateBlogPostSchema,
  type BlogQuery,
  type CreateBlogPostInput,
  type PostIdParam,
  type PostSlugParam,
  type UpdateBlogPostInput,
} from "./domain/blogPost.rules.js";

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
  app.get<{ Querystring: BlogQuery }>(
    "/blog/search",
    {
      schema: {
        tags: ["Blog"],
        summary: "Search published blog posts (public)",
        querystring: BlogQuerySchema,
        response: { 200: BlogPostListResponseSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.search.bind(controller),
  );

  app.get<{ Querystring: BlogQuery }>(
    "/blog",
    {
      schema: {
        tags: ["Blog"],
        summary: "List blog articles with pagination (public)",
        querystring: BlogQuerySchema,
        response: { 200: BlogPostListResponseSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.list.bind(controller),
  );

  app.get<{ Querystring: BlogQuery }>(
    "/blog/posts",
    {
      schema: {
        tags: ["Blog"],
        summary: "List blog posts with pagination (public)",
        querystring: BlogQuerySchema,
        response: { 200: BlogPostListResponseSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.list.bind(controller),
  );

  app.get<{ Params: PostSlugParam }>(
    "/blog/posts/by-slug/:slug",
    {
      schema: {
        tags: ["Blog"],
        summary: "Get single blog article by URL slug (public)",
        params: PostSlugParamSchema,
        response: { 200: BlogPostDocSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.getBySlug.bind(controller),
  );

  app.get<{ Params: PostIdParam }>(
    "/blog/posts/:id",
    {
      schema: {
        tags: ["Blog"],
        summary: "Get single blog article by ID (public)",
        params: PostIdParamSchema,
        response: { 200: BlogPostDocSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.getById.bind(controller),
  );

  app.get<{ Params: PostSlugParam }>(
    "/blog/:slug",
    {
      schema: {
        tags: ["Blog"],
        summary: "Get single blog article by URL slug or ID fallback (public)",
        params: PostSlugParamSchema,
        response: { 200: BlogPostDocSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.getBySlug.bind(controller),
  );

  // 2. Authenticated Admin routes (with 🔒 security definitions)
  app.post<{ Body: CreateBlogPostInput }>(
    "/blog",
    {
      schema: {
        tags: ["Blog"],
        summary: "Create a new blog article (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: CreateBlogPostSchema,
        response: { 201: BlogPostDocSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.create.bind(controller),
  );

  app.post<{ Body: CreateBlogPostInput }>(
    "/blog/posts",
    {
      schema: {
        tags: ["Blog"],
        summary: "Create a new blog article (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: CreateBlogPostSchema,
        response: { 201: BlogPostDocSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.create.bind(controller),
  );

  app.put<{ Params: PostIdParam; Body: UpdateBlogPostInput }>(
    "/blog/:id",
    {
      schema: {
        tags: ["Blog"],
        summary: "Update an existing blog article (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: PostIdParamSchema,
        body: UpdateBlogPostSchema,
        response: { 200: BlogPostDocSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.update.bind(controller),
  );

  app.put<{ Params: PostIdParam; Body: UpdateBlogPostInput }>(
    "/blog/posts/:id",
    {
      schema: {
        tags: ["Blog"],
        summary: "Update an existing blog article (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: PostIdParamSchema,
        body: UpdateBlogPostSchema,
        response: { 200: BlogPostDocSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.update.bind(controller),
  );

  app.delete<{ Params: PostIdParam }>(
    "/blog/:id",
    {
      schema: {
        tags: ["Blog"],
        summary: "Delete a blog article and capture redirect (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: PostIdParamSchema,
        response: { 204: z.null() },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.deleteById.bind(controller),
  );

  app.delete<{ Params: PostIdParam }>(
    "/blog/posts/:id",
    {
      schema: {
        tags: ["Blog"],
        summary: "Delete a blog article (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: PostIdParamSchema,
        response: { 204: z.null() },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.deleteById.bind(controller),
  );

  app.get<{ Params: PostIdParam }>(
    "/blog/:id/versions",
    {
      schema: {
        tags: ["Blog"],
        summary: "Get version snapshot history for a blog article (Admin)",
        security: [{ cookieAuth: [] }],
        params: PostIdParamSchema,
        response: { 200: BlogPostVersionsResponseSchema },
      },
      preHandler: [authenticate, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.getVersions.bind(controller),
  );

  app.get<{ Params: PostIdParam }>(
    "/blog/posts/:id/versions",
    {
      schema: {
        tags: ["Blog"],
        summary: "Get version snapshot history for a blog article (Admin)",
        security: [{ cookieAuth: [] }],
        params: PostIdParamSchema,
        response: { 200: BlogPostVersionsResponseSchema },
      },
      preHandler: [authenticate, checkPermission(BLOG_PERMISSIONS.WRITE)],
    },
    controller.getVersions.bind(controller),
  );
}
