import {
  BadRequestError,
  createPluginGuard,
  hooks,
  NotFoundError,
  pluginLoader,
  serializeDocument,
  serializeDocuments,
} from "@cms/core";
import type { FastifyInstance, FastifyRequest } from "fastify";
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
const pageBaseSchema = z.object({
  title: z.string(),
  slug: z.string(),
  status: z.enum(["draft", "published"]),
  blocks: z.array(blockSchema),
});

const pageSchema = pageBaseSchema.extend({
  status: z.enum(["draft", "published"]).default("draft"),
});
const pageUpdateSchema = pageBaseSchema.partial().required({ blocks: true });

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
  fastify.addHook("preHandler", createPluginGuard(name, "/pages"));

  // Get all pages list
  fastify.get("/pages", async (request: FastifyRequest) => {
    const isAdmin = request.user?.permissions?.includes("pages:read") ?? false;
    const filter = isAdmin ? {} : { status: "published" as const };
    const pages = await pagesRepo.find(filter, { title: 1, slug: 1, status: 1, createdAt: 1 });
    return { status: "success", pages: serializeDocuments(pages) };
  });

  // Get page by ID or slug
  fastify.get("/pages/:idOrSlug", async (request: FastifyRequest) => {
    const { idOrSlug } = request.params as { idOrSlug: string };

    const page = await pagesRepo.findByIdOrSlug(idOrSlug);
    if (!page) {
      throw new NotFoundError("Page");
    }

    // Check draft access
    const isAdmin = request.user?.permissions?.includes("pages:read") ?? false;
    if (page.status === "draft" && !isAdmin) {
      throw new NotFoundError("Page");
    }

    interface SerializedPage {
      _id: string;
      title: string;
      slug: string;
      status: "draft" | "published";
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
    async (request: FastifyRequest) => {
      const body = request.body as PageBody;

      const slugTaken = await pagesRepo.isSlugTaken(body.slug);
      if (slugTaken) {
        throw new BadRequestError("Slug already exists");
      }

      const createdPage = await pagesRepo.create({
        slug: body.slug,
        title: body.title,
        status: body.status ?? "draft",
        blocks: body.blocks,
      });

      // Emit event
      hooks.emit("page.created", createdPage, request.user, request.ip);

      return { status: "success", page: createdPage };
    },
  );

  // Update page
  fastify.put(
    "/pages/:id",
    {
      preHandler: [authenticate, checkPermission("pages:write")],
      schema: { body: pageUpdateSchema },
    },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<PageBody> & { blocks: (typeof blockSchema)[] };

      const page = await pagesRepo.findById(id);
      if (!page) {
        throw new NotFoundError("Page");
      }

      // Check slug uniqueness (exclude current page)
      if (body.slug && body.slug !== page.slug) {
        const slugTaken = await pagesRepo.isSlugTaken(body.slug, id);
        if (slugTaken) {
          throw new BadRequestError("Slug already exists");
        }
      }

      // Save version snapshot
      await pagesRepo.saveVersionSnapshot(page, request.user?.id ?? null);

      const updatedPage = await pagesRepo.update(id, {
        ...(body.title && { title: body.title }),
        ...(body.slug && { slug: body.slug }),
        ...(body.status && { status: body.status }),
        blocks: body.blocks,
      });

      if (updatedPage) {
        // Emit event
        hooks.emit("page.updated", updatedPage, request.user, request.ip);
      }

      return { status: "success", message: "Page updated successfully" };
    },
  );

  // Delete page
  fastify.delete(
    "/pages/:id",
    {
      preHandler: [authenticate, checkPermission("pages:delete")],
    },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };

      const page = await pagesRepo.findById(id);
      if (!page) {
        throw new NotFoundError("Page");
      }

      const deleted = await pagesRepo.delete(id);
      if (!deleted) {
        throw new Error("Failed to delete page");
      }

      // Emit event
      hooks.emit("page.deleted", page, request.user, request.ip);

      return { status: "success", message: "Page deleted successfully" };
    },
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
