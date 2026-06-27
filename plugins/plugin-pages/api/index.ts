import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { hooks } from "@cms/core";

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

export const name = "@cms/plugin-pages-api";
export const version = "1.0.0";

async function register(fastify: FastifyInstance, options: any) {
  const db = (fastify as any).db;
  const logger = (fastify as any).logger;
  const authenticate = (fastify as any).authenticate;
  const checkPermission = (fastify as any).checkPermission;

  logger.info("📄 Plugin-Pages: Initializing dynamic pages routes...");

  const pagesCol = db.getCollection("cms_pages");

  // Middleware: Check if plugin is enabled
  const checkPluginEnabled = async (request: FastifyRequest, reply: FastifyReply) => {
    const { PluginLoader } = await import("@cms/core");
    if (!PluginLoader.isEnabled(name)) {
      reply.status(503).send({ 
        status: "error", 
        message: "Pages plugin is currently disabled" 
      });
    }
  };

  // Get all pages list
  fastify.get("/pages", { preHandler: [checkPluginEnabled] }, async () => {
    const pages = await pagesCol.find({}, { projection: { title: 1, slug: 1, createdAt: 1 } }).toArray();
    
    // Serialize ObjectId to string
    const serializedPages = pages.map(page => ({
      ...page,
      _id: page._id.toString(),
    }));
    
    return { status: "success", pages: serializedPages };
  });

  // Get page by ID or slug
  fastify.get("/pages/:idOrSlug", { preHandler: [checkPluginEnabled] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    
    let page;
    
    // Try as ObjectId first
    try {
      const objectId = new ObjectId(idOrSlug);
      page = await pagesCol.findOne({ _id: objectId });
    } catch (err) {
      // Not a valid ObjectId, try as slug
      page = await pagesCol.findOne({ slug: idOrSlug });
    }
    
    if (!page) {
      reply.status(404).send({ status: "error", message: "Page not found" });
      return;
    }
    
    // Serialize ObjectId to string
    const serializedPage = {
      ...page,
      _id: page._id.toString(),
    };

    // Filter out blocks of disabled plugins for public users (non-admins)
    let isAdmin = false;
    const token = request.cookies?.token;
    if (token) {
      try {
        const config = (fastify as any).config;
        const jwt = await import("jsonwebtoken");
        jwt.default.verify(token, config.JWT_SECRET);
        isAdmin = true;
      } catch (err) {
        // Ignore and treat as public user
      }
    }

    if (!isAdmin && serializedPage.blocks && Array.isArray(serializedPage.blocks)) {
      const { PluginLoader } = await import("@cms/core");
      serializedPage.blocks = serializedPage.blocks.filter((block: any) => {
        if (block.type === "form" && !PluginLoader.isEnabled("@cms/plugin-forms-api")) {
          return false;
        }
        if (block.type === "blog_posts" && !PluginLoader.isEnabled("@cms/plugin-blog-api")) {
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
      preHandler: [checkPluginEnabled, authenticate, checkPermission("pages:write")],
      schema: {
        body: z.object({
          title: z.string(),
          slug: z.string().min(1),
          blocks: z.array(blockSchema),
        }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;
      
      // Ensure slug uniqueness
      const existing = await pagesCol.findOne({ slug: body.slug });
      if (existing) {
        reply.status(400).send({ status: "error", message: "Slug already exists" });
        return;
      }

      const newPage = {
        slug: body.slug,
        title: body.title,
        blocks: body.blocks,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await pagesCol.insertOne(newPage);
      
      // Emit event
      hooks.emit("page.created", newPage, (request as any).user, request.ip);

      // Serialize ObjectId to string
      const serializedPage = {
        ...newPage,
        _id: result.insertedId.toString(),
      };

      return { status: "success", page: serializedPage };
    }
  );

  // Update page
  fastify.put(
    "/pages/:id",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("pages:write")],
      schema: {
        body: pageSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof pageSchema>;

      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch (err) {
        reply.status(400).send({ status: "error", message: "Invalid page ID" });
        return;
      }

      const page = await pagesCol.findOne({ _id: objectId });
      if (!page) {
        reply.status(404).send({ status: "error", message: "Page not found" });
        return;
      }

      // Check slug uniqueness (exclude current page)
      if (body.slug !== page.slug) {
        const existing = await pagesCol.findOne({ 
          slug: body.slug,
          _id: { $ne: objectId }
        });
        if (existing) {
          reply.status(400).send({ status: "error", message: "Slug already exists" });
          return;
        }
      }

      // Save version snapshot
      try {
        const versionsCol = db.getCollection("cms_post_versions");
        const currentVersionCount = await versionsCol.countDocuments({ postId: page._id });
        await versionsCol.insertOne({
          postId: page._id,
          versionNumber: currentVersionCount + 1,
          data: page,
          savedBy: (request as any).user ? (request as any).user.id : null,
          createdAt: new Date(),
        });
      } catch (versionErr) {
        logger.error(versionErr, "Failed to write page version snapshot");
      }

      const updatedPage = {
        ...page,
        title: body.title,
        slug: body.slug,
        blocks: body.blocks,
        updatedAt: new Date(),
      };

      await pagesCol.updateOne(
        { _id: objectId },
        {
          $set: {
            title: body.title,
            slug: body.slug,
            blocks: body.blocks,
            updatedAt: new Date(),
          },
        }
      );

      // Emit event
      hooks.emit("page.updated", updatedPage, (request as any).user, request.ip);

      return { status: "success", message: "Page updated successfully" };
    }
  );

  // Delete page
  fastify.delete(
    "/pages/:id",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("pages:delete")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      
      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch (err) {
        reply.status(400).send({ status: "error", message: "Invalid page ID" });
        return;
      }
      
      const page = await pagesCol.findOne({ _id: objectId });
      if (!page) {
        reply.status(404).send({ status: "error", message: "Page not found" });
        return;
      }

      const result = await pagesCol.deleteOne({ _id: objectId });
      if (result.deletedCount === 0) {
        reply.status(404).send({ status: "error", message: "Page not found" });
        return;
      }

      // Emit event
      hooks.emit("page.deleted", page, (request as any).user, request.ip);

      return { status: "success", message: "Page deleted successfully" };
    }
  );

  // --- SETTINGS ENDPOINTS ---
  const settingsCol = db.getCollection("cms_settings");

  // Get settings
  fastify.get("/settings", { preHandler: [checkPluginEnabled] }, async () => {
    let settings = await settingsCol.findOne({});
    if (!settings) {
      // Return defaults if not set in DB yet
      settings = {
        brandName: "ModularCMS",
        primaryColor: "#8b5cf6",
        secondaryColor: "#4f46e5",
      };
    }
    return { status: "success", settings };
  });

  // Update settings
  fastify.put(
    "/settings",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("settings:write")],
      schema: {
        body: z.object({
          brandName: z.string().min(1),
          primaryColor: z.string().min(4),
          secondaryColor: z.string().min(4),
        }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const body = request.body as any;

      await settingsCol.updateOne(
        {},
        {
          $set: {
            brandName: body.brandName,
            primaryColor: body.primaryColor,
            secondaryColor: body.secondaryColor,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Emit event
      hooks.emit("settings.updated", body, user, request.ip);

      return { status: "success", message: "Settings updated successfully", settings: body };
    }
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
