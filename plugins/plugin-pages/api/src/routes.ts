import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  CreatePageSchema,
  PAGES_PERMISSIONS,
  PageDocSchema,
  PageIdParamSchema,
  PageListResponseSchema,
  PageQuerySchema,
  PageSlugParamSchema,
  PageVersionsResponseSchema,
  UpdatePageSchema,
  type CreatePageInput,
  type PageIdParam,
  type PageQuery,
  type PageSlugParam,
  type UpdatePageInput,
} from "./domain/page.rules.js";
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
        response: { 200: PageDocSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.getHome.bind(controller),
  );

  app.get<{ Querystring: PageQuery }>(
    "/pages/search",
    {
      schema: {
        tags: ["Pages"],
        summary: "Search published pages (public)",
        querystring: PageQuerySchema,
        response: { 200: PageListResponseSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.search.bind(controller),
  );

  app.get<{ Querystring: PageQuery }>(
    "/pages",
    {
      schema: {
        tags: ["Pages"],
        summary: "List pages with pagination and filters",
        querystring: PageQuerySchema,
        response: { 200: PageListResponseSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.list.bind(controller),
  );

  app.get<{ Params: PageSlugParam }>(
    "/pages/by-slug/:slug",
    {
      schema: {
        tags: ["Pages"],
        summary: "Get page by URL slug (public)",
        params: PageSlugParamSchema,
        response: { 200: PageDocSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.getBySlug.bind(controller),
  );

  app.get<{ Params: PageSlugParam }>(
    "/pages/:slug",
    {
      schema: {
        tags: ["Pages"],
        summary: "Get page by URL slug or ID fallback (public)",
        params: PageSlugParamSchema,
        response: { 200: PageDocSchema },
      },
      preHandler: [optionalAuth],
    },
    controller.getBySlug.bind(controller),
  );

  // 2. Authenticated Admin routes (with 🔒 security definitions)
  app.post<{ Body: CreatePageInput }>(
    "/pages",
    {
      schema: {
        tags: ["Pages"],
        summary: "Create a new page (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: CreatePageSchema,
        response: { 201: PageDocSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.create.bind(controller),
  );

  app.put<{ Params: PageIdParam; Body: UpdatePageInput }>(
    "/pages/:id",
    {
      schema: {
        tags: ["Pages"],
        summary: "Update an existing page (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: PageIdParamSchema,
        body: UpdatePageSchema,
        response: { 200: PageDocSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.update.bind(controller),
  );

  app.delete<{ Params: PageIdParam }>(
    "/pages/:id",
    {
      schema: {
        tags: ["Pages"],
        summary: "Delete a page and capture redirect (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: PageIdParamSchema,
        response: { 204: z.null() },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.deleteById.bind(controller),
  );

  app.get<{ Params: PageIdParam }>(
    "/pages/:id/versions",
    {
      schema: {
        tags: ["Pages"],
        summary: "Get version snapshot history for a page (Admin)",
        security: [{ cookieAuth: [] }],
        params: PageIdParamSchema,
        response: { 200: PageVersionsResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PAGES_PERMISSIONS.WRITE)],
    },
    controller.getVersions.bind(controller),
  );
}
