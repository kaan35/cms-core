import {
  BadRequestError,
  createPluginGuard,
  hooks,
  NotFoundError,
  serializeDocument,
  serializeDocuments,
} from "@cms/core";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { BlogPostsRepository } from "./BlogPostsRepository.ts";

// Zod Blog Post Schema
const blogPostSchema = z.object({
  title: z.string(),
  slug: z.string().min(1),
  summary: z.string(),
  content: z.string(),
  status: z.enum(["draft", "published"]).default("published"),
});

const updateBlogPostSchema = blogPostSchema.extend({
  status: z.enum(["draft", "published"]).optional(),
});

type BlogPostBody = z.infer<typeof blogPostSchema>;
type UpdateBlogPostBody = z.infer<typeof updateBlogPostSchema>;

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

  logger.info("📝 Plugin-Blog: Initializing blog post routes using Repository pattern...");

  const blogPostsRepo = new BlogPostsRepository(db, logger);

  // Check if plugin is enabled globally for all routes in this plugin
  fastify.addHook("preHandler", createPluginGuard(name, "/blog"));

  // List blog posts
  fastify.get("/blog", async (request: FastifyRequest) => {
    const { status } = request.query as BlogListQuery;
    const canReadDraft = !!request.user?.permissions?.includes("blog:read:draft");

    let filter: { status?: "draft" | "published" } = { status: "published" };

    if (canReadDraft) {
      if (status === "draft" || status === "published") {
        filter = { status };
      } else {
        // If status is not specified, authorized users can see all posts (draft + published)
        filter = {};
      }
    }

    const posts = await blogPostsRepo.find(filter);
    return { status: "success", posts: serializeDocuments(posts) };
  });

  // Get blog post by ID or slug
  fastify.get("/blog/:idOrSlug", async (request: FastifyRequest) => {
    const { idOrSlug } = request.params as { idOrSlug: string };

    const post = await blogPostsRepo.findByIdOrSlug(idOrSlug);
    if (!post) {
      throw new NotFoundError("Blog post");
    }

    // If it's a draft and the user does NOT have 'blog:read:draft' permission, return 404 (hide existence)
    if (post.status === "draft" && !request.user?.permissions?.includes("blog:read:draft")) {
      throw new NotFoundError("Blog post");
    }

    return { status: "success", post: serializeDocument(post) };
  });

  // Create blog post
  fastify.post(
    "/blog",
    {
      preHandler: [authenticate, checkPermission("blog:write")],
      schema: {
        body: blogPostSchema,
      },
    },
    async (request: FastifyRequest) => {
      const body = request.body as BlogPostBody;

      const slugTaken = await blogPostsRepo.isSlugTaken(body.slug);
      if (slugTaken) {
        throw new BadRequestError("Slug already exists");
      }

      const createdPost = await blogPostsRepo.create({
        slug: body.slug,
        title: body.title,
        summary: body.summary,
        content: body.content,
        status: body.status,
      });

      hooks.emit("blog.created", createdPost, request.user, request.ip);

      return {
        status: "success",
        post: createdPost,
      };
    },
  );

  // Update blog post
  fastify.put(
    "/blog/:id",
    {
      preHandler: [authenticate, checkPermission("blog:write")],
      schema: { body: updateBlogPostSchema },
    },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateBlogPostBody;

      const post = await blogPostsRepo.findById(id);
      if (!post) {
        throw new NotFoundError("Blog post");
      }

      // Check slug uniqueness (exclude current post)
      if (body.slug !== post.slug) {
        const slugTaken = await blogPostsRepo.isSlugTaken(body.slug, id);
        if (slugTaken) {
          throw new BadRequestError("Slug already exists");
        }
      }

      // Save version snapshot
      await blogPostsRepo.saveVersionSnapshot(post, request.user?.id ?? null);

      const updatedPost = await blogPostsRepo.update(id, {
        title: body.title,
        slug: body.slug,
        summary: body.summary,
        content: body.content,
        status: body.status ?? post.status,
      });

      if (updatedPost) {
        hooks.emit("blog.updated", updatedPost, request.user, request.ip);
      }

      return { status: "success", message: "Blog post updated successfully" };
    },
  );

  // Delete blog post
  fastify.delete(
    "/blog/:id",
    { preHandler: [authenticate, checkPermission("blog:delete")] },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };

      const post = await blogPostsRepo.findById(id);
      if (!post) {
        throw new NotFoundError("Blog post");
      }

      const deleted = await blogPostsRepo.delete(id);
      if (!deleted) {
        throw new Error("Failed to delete blog post");
      }

      hooks.emit("blog.deleted", post, request.user, request.ip);

      return { status: "success", message: "Blog post deleted successfully" };
    },
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
