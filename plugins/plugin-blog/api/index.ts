import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import {
  hooks,
  createPluginGuard,
  parseObjectId,
  serializeDocument,
  serializeDocuments,
} from "@cms/core";

// Zod Blog Post Schema
const blogPostSchema = z.object({
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  content: z.string(),
  status: z.enum(["draft", "published"]).default("published"),
});

// Reuse the same type from schema
type BlogPostBody = z.infer<typeof blogPostSchema>;

// Query params for list endpoint
interface BlogListQuery {
  status?: string;
}

export const name = "@cms/plugin-blog-api";
export const version = "1.0.0";

async function register(fastify: FastifyInstance, _options: Record<string, unknown> = {}) {
  const db = fastify.db;
  const logger = fastify.logger;
  const authenticate = fastify.authenticate;
  const checkPermission = fastify.checkPermission;

  logger.info("📝 Plugin-Blog: Initializing blog post routes...");

  const blogCol = db.getCollection("cms_blog_posts");

  // Check if plugin is enabled globally for all routes in this plugin
  fastify.addHook("preHandler", createPluginGuard(name));

  // List blog posts
  fastify.get("/blog", async (request: FastifyRequest) => {
    const { status } = request.query as BlogListQuery;
    const filter = status ? { status } : {};
    const posts = await blogCol.find(filter).sort({ createdAt: -1 }).toArray();
    return { status: "success", posts: serializeDocuments(posts) };
  });

  // Get blog post by ID or slug
  fastify.get("/blog/:idOrSlug", async (request: FastifyRequest, reply: FastifyReply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };

    let post;
    try {
      post = await blogCol.findOne({ _id: parseObjectId(idOrSlug) });
    } catch {
      post = await blogCol.findOne({ slug: idOrSlug });
    }

    if (!post) {
      reply.status(404).send({ status: "error", message: "Blog post not found" });
      return;
    }

    return { status: "success", post: serializeDocument(post) };
  });

  // Create blog post
  fastify.post(
    "/blog",
    {
      preHandler: [authenticate, checkPermission("blog:write")],
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
      const body = request.body as BlogPostBody;

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
        status: body.status ?? "published",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await blogCol.insertOne(newPost);
      hooks.emit("blog.created", newPost, request.user, request.ip);

      return {
        status: "success",
        post: { ...newPost, _id: result.insertedId.toString() },
      };
    }
  );

  // Update blog post
  fastify.put(
    "/blog/:id",
    {
      preHandler: [authenticate, checkPermission("blog:write")],
      schema: { body: blogPostSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as BlogPostBody;

      let objectId;
      try {
        objectId = parseObjectId(id);
      } catch {
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
        const slugExists = await blogCol.findOne({ slug: body.slug, _id: { $ne: objectId } });
        if (slugExists) {
          reply.status(400).send({ status: "error", message: "Slug already exists" });
          return;
        }
      }

      // Save version snapshot
      try {
        const versionsCol = db.getCollection("cms_post_versions");
        const versionCount = await versionsCol.countDocuments({ postId: post._id });
        await versionsCol.insertOne({
          postId: post._id,
          versionNumber: versionCount + 1,
          data: post,
          savedBy: request.user?.id ?? null,
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

      await blogCol.updateOne({ _id: objectId }, { $set: updatedPost });
      hooks.emit("blog.updated", updatedPost, request.user, request.ip);

      return { status: "success", message: "Blog post updated successfully" };
    }
  );

  // Delete blog post
  fastify.delete(
    "/blog/:id",
    { preHandler: [authenticate, checkPermission("blog:delete")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      let objectId;
      try {
        objectId = parseObjectId(id);
      } catch {
        reply.status(400).send({ status: "error", message: "Invalid blog post ID" });
        return;
      }

      const post = await blogCol.findOne({ _id: objectId });
      if (!post) {
        reply.status(404).send({ status: "error", message: "Blog post not found" });
        return;
      }

      await blogCol.deleteOne({ _id: objectId });
      hooks.emit("blog.deleted", post, request.user, request.ip);

      return { status: "success", message: "Blog post deleted successfully" };
    }
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
