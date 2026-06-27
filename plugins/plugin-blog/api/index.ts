import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { hooks } from "@cms/core";

// Zod Blog Post Schema
const blogPostSchema = z.object({
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  content: z.string(),
  status: z.enum(["draft", "published"]).default("published"),
});

export const name = "@cms/plugin-blog-api";
export const version = "1.0.0";

async function register(fastify: FastifyInstance, options: any) {
  const db = (fastify as any).db;
  const logger = (fastify as any).logger;
  const authenticate = (fastify as any).authenticate;
  const checkPermission = (fastify as any).checkPermission;

  logger.info("📝 Plugin-Blog: Initializing blog post routes...");

  const blogCol = db.getCollection("cms_blog_posts");

  // Middleware: Check if plugin is enabled
  const checkPluginEnabled = async (request: FastifyRequest, reply: FastifyReply) => {
    const { PluginLoader } = await import("@cms/core");
    if (!PluginLoader.isEnabled(name)) {
      reply.status(503).send({ 
        status: "error", 
        message: "Blog plugin is currently disabled" 
      });
    }
  };

  // List blog posts
  fastify.get("/blog", { preHandler: [checkPluginEnabled] }, async (request: FastifyRequest) => {
    const query = request.query as any;
    const filter = query.status ? { status: query.status } : {};
    const posts = await blogCol.find(filter).sort({ createdAt: -1 }).toArray();
    
    // Serialize ObjectId to string
    const serializedPosts = posts.map(post => ({
      ...post,
      _id: post._id.toString(),
    }));
    
    return { status: "success", posts: serializedPosts };
  });

  // Get blog post by ID or slug
  fastify.get("/blog/:idOrSlug", { preHandler: [checkPluginEnabled] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    
    let post;
    
    // Try as ObjectId first
    try {
      const objectId = new ObjectId(idOrSlug);
      post = await blogCol.findOne({ _id: objectId });
    } catch (err) {
      // Not a valid ObjectId, try as slug
      post = await blogCol.findOne({ slug: idOrSlug });
    }
    
    if (!post) {
      reply.status(404).send({ status: "error", message: "Blog post not found" });
      return;
    }
    
    // Serialize ObjectId to string
    const serializedPost = {
      ...post,
      _id: post._id.toString(),
    };
    
    return { status: "success", post: serializedPost };
  });

  // Create blog post
  fastify.post(
    "/blog",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("blog:write")],
      schema: {
        body: z.object({
          title: z.string(),
          slug: z.string().min(1),
          summary: z.string(),
          content: z.string(),
          status: z.enum(["draft", "published"]).optional(),
        }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;

      const existing = await blogCol.findOne({ slug: body.slug });
      if (existing) {
        reply.status(400).send({ status: "error", message: "Slug already exists" });
        return;
      }

      const newPost = {
        slug: body.slug,
        title: body.title,
        summary: body.summary,
        content: body.content,
        status: body.status || "published",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await blogCol.insertOne(newPost);

      // Emit event
      hooks.emit("blog.created", newPost, (request as any).user, request.ip);

      // Serialize ObjectId to string
      const serializedPost = {
        ...newPost,
        _id: result.insertedId.toString(),
      };

      return { status: "success", post: serializedPost };
    }
  );

  // Update blog post
  fastify.put(
    "/blog/:id",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("blog:write")],
      schema: {
        body: blogPostSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof blogPostSchema>;

      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch (err) {
        reply.status(400).send({ status: "error", message: "Invalid blog post ID" });
        return;
      }

      const post = await blogCol.findOne({ _id: objectId });
      if (!post) {
        reply.status(404).send({ status: "error", message: "Blog post not found" });
        return;
      }

      // Check slug uniqueness (exclude current post)
      if (body.slug !== post.slug) {
        const existing = await blogCol.findOne({ 
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
        const currentVersionCount = await versionsCol.countDocuments({ postId: post._id });
        await versionsCol.insertOne({
          postId: post._id,
          versionNumber: currentVersionCount + 1,
          data: post,
          savedBy: (request as any).user ? (request as any).user.id : null,
          createdAt: new Date(),
        });
      } catch (versionErr) {
        logger.error(versionErr, "Failed to write blog post version snapshot");
      }

      const updatedPost = {
        ...post,
        title: body.title,
        slug: body.slug,
        summary: body.summary,
        content: body.content,
        status: body.status,
        updatedAt: new Date(),
      };

      await blogCol.updateOne(
        { _id: objectId },
        {
          $set: {
            title: body.title,
            slug: body.slug,
            summary: body.summary,
            content: body.content,
            status: body.status,
            updatedAt: new Date(),
          },
        }
      );

      // Emit event
      hooks.emit("blog.updated", updatedPost, (request as any).user, request.ip);

      return { status: "success", message: "Blog post updated successfully" };
    }
  );

  // Delete blog post
  fastify.delete(
    "/blog/:id",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("blog:delete")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      
      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch (err) {
        reply.status(400).send({ status: "error", message: "Invalid blog post ID" });
        return;
      }
      
      const post = await blogCol.findOne({ _id: objectId });
      if (!post) {
        reply.status(404).send({ status: "error", message: "Blog post not found" });
        return;
      }

      const result = await blogCol.deleteOne({ _id: objectId });
      if (result.deletedCount === 0) {
        reply.status(404).send({ status: "error", message: "Blog post not found" });
        return;
      }

      // Emit event
      hooks.emit("blog.deleted", post, (request as any).user, request.ip);

      return { status: "success", message: "Blog post deleted successfully" };
    }
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
