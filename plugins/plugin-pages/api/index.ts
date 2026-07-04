import { createPluginGuard, hooks, pluginLoader, serializeDocument, serializeDocuments } from "@cms/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { PagesRepository } from "./PagesRepository.ts";

// Zod Block Schema
const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["hero", "text", "form", "blog_posts"]),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  content: z.string().optional(),
  formId: z.string().optional(),
  count: z.number().optional(),
});

// Zod Page Schema
const pageSchema = z.object({
  title: z.string(),
  slug: z.string(),
  blocks: z.array(blockSchema),
});

type PageBody = z.infer<typeof pageSchema>;

export const name = "@cms/plugin-pages-api";
export const version = "1.0.0";

async function register(fastify: FastifyInstance, _options: Record<string, unknown> = {}) {
  const db = fastify.db;
  const logger = fastify.logger;
  const authenticate = fastify.authenticate;
  const checkPermission = fastify.checkPermission;

  logger.info("📄 Plugin-Pages: Initializing dynamic pages routes using Repository pattern...");

  const pagesRepo = new PagesRepository(db, logger);

  // Hook: Check if plugin is enabled globally for all routes in this plugin
  fastify.addHook("preHandler", createPluginGuard(name));

  // Get all pages list
  fastify.get("/pages", async () => {
    const pages = await pagesRepo.find({}, { title: 1, slug: 1, createdAt: 1 });
    return { status: "success", pages: serializeDocuments(pages) };
  });

  // Get page by ID or slug
  fastify.get("/pages/:idOrSlug", async (request: FastifyRequest, reply: FastifyReply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };

    const page = await pagesRepo.findByIdOrSlug(idOrSlug);
    if (!page) {
      reply.status(404).send({ status: "error", message: "Page not found" });
      return;
    }

    interface SerializedPage {
      _id: string;
      title: string;
      slug: string;
      blocks?: Array<{
        id: string;
        type: "hero" | "text" | "form" | "blog_posts";
        title?: string;
        subtitle?: string;
        content?: string;
        formId?: string;
        count?: number;
      }>;
      createdAt: Date;
      updatedAt: Date;
    }

    const serializedPage = serializeDocument(page) as unknown as SerializedPage;

    // Filter out blocks of disabled plugins for public users (non-admins)
    let isAdmin = false;
    const token = request.cookies?.token;
    if (token) {
      try {
        const config = fastify.config;
        const jwt = await import("jsonwebtoken");
        const decoded = jwt.default.verify(token, config.JWT_SECRET) as { permissions?: string[] };
        // Verify user has read permissions to bypass filters
        if (decoded && decoded.permissions && decoded.permissions.includes("pages:read")) {
          isAdmin = true;
        }
      } catch (err) {
        // Ignore and treat as public user
      }
    }

    if (!isAdmin && serializedPage.blocks && Array.isArray(serializedPage.blocks)) {
      serializedPage.blocks = serializedPage.blocks.filter((block) => {
        if (block.type === "form" && !pluginLoader.isEnabled("@cms/plugin-forms-api")) {
          return false;
        }
        if (block.type === "blog_posts" && !pluginLoader.isEnabled("@cms/plugin-blog-api")) {
          return false;
        }
        return true;
      });
    }

    return { status: "success", page: serializedPage };
  });

  // Create page
  fastify.post(
    "/pages",
    {
      preHandler: [authenticate, checkPermission("pages:write")],
      schema: { body: pageSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as PageBody;

      const slugTaken = await pagesRepo.isSlugTaken(body.slug);
      if (slugTaken) {
        reply.status(400).send({ status: "error", message: "Slug already exists" });
        return;
      }

      const createdPage = await pagesRepo.create({
        slug: body.slug,
        title: body.title,
        blocks: body.blocks,
      });

      // Emit event
      hooks.emit("page.created", createdPage, request.user, request.ip);

      return { status: "success", page: createdPage };
    }
  );

  // Update page
  fastify.put(
    "/pages/:id",
    {
      preHandler: [authenticate, checkPermission("pages:write")],
      schema: { body: pageSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as PageBody;

      const page = await pagesRepo.findById(id);
      if (!page) {
        reply.status(404).send({ status: "error", message: "Page not found" });
        return;
      }

      // Check slug uniqueness (exclude current page)
      if (body.slug !== page.slug) {
        const slugTaken = await pagesRepo.isSlugTaken(body.slug, id);
        if (slugTaken) {
          reply.status(400).send({ status: "error", message: "Slug already exists" });
          return;
        }
      }

      // Save version snapshot
      await pagesRepo.saveVersionSnapshot(page, request.user?.id ?? null);

      const updatedPage = await pagesRepo.update(id, {
        title: body.title,
        slug: body.slug,
        blocks: body.blocks,
      });

      if (updatedPage) {
        // Emit event
        hooks.emit("page.updated", updatedPage, request.user, request.ip);
      }

      return { status: "success", message: "Page updated successfully" };
    }
  );

  // Delete page
  fastify.delete(
    "/pages/:id",
    {
      preHandler: [authenticate, checkPermission("pages:delete")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const page = await pagesRepo.findById(id);
      if (!page) {
        reply.status(404).send({ status: "error", message: "Page not found" });
        return;
      }

      const deleted = await pagesRepo.delete(id);
      if (!deleted) {
        reply.status(404).send({ status: "error", message: "Page not found" });
        return;
      }

      // Emit event
      hooks.emit("page.deleted", page, request.user, request.ip);

      return { status: "success", message: "Page deleted successfully" };
    }
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
