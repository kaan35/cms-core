import type { CoreServices } from "@cms/core";
import type { FastifyInstance } from "fastify";
import { BlogPostController } from "./blogPostController.js";
import { BlogPostService } from "./blogPostService.js";
import { BlogPostsRepository } from "./repositories/blogPostsRepository.js";

export { BlogPostService } from "./blogPostService.js";
export {
  BLOG_EVENTS,
  BLOG_PERMISSIONS,
  BlogPostStatusSchema,
  CreateBlogPostSchema,
  UpdateBlogPostSchema,
  validateCreateBlogPost,
  validateUpdateBlogPost,
} from "./domain/blogPost.rules.js";
export type {
  BlogPostDoc,
  BlogPostStatus,
  BlogPostVersionDoc,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from "./domain/blogPost.rules.js";
export { initBlogMigration } from "./migrations/202601050000_init_blog.js";
export { BlogPostsRepository } from "./repositories/blogPostsRepository.js";

export async function registerBlogPlugin(
  app: FastifyInstance,
  services: CoreServices,
): Promise<void> {
  const { db, logger, hooks, redirects } = services;

  const blogRepo = new BlogPostsRepository(db, redirects);
  const blogService = new BlogPostService(blogRepo, hooks, logger);
  const controller = new BlogPostController(blogService, redirects);

  const { registerBlogRoutes } = await import("./routes.js");
  registerBlogRoutes(app, controller);
}
