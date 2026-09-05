import type { IHookManager, ILogger, PaginatedResult } from "@cms/core";
import { NotFoundError } from "@cms/core";
import type { BlogPostDoc, BlogPostVersionDoc } from "./domain/blogPost.rules.js";
import {
  BLOG_EVENTS,
  validateCreateBlogPost,
  validateUpdateBlogPost,
} from "./domain/blogPost.rules.js";
import type { BlogPostsRepository } from "./repositories/blogPostsRepository.js";

export class BlogPostService {
  private readonly blogRepo: BlogPostsRepository;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;

  constructor(blogRepo: BlogPostsRepository, hooks: IHookManager, logger: ILogger) {
    this.blogRepo = blogRepo;
    this.hooks = hooks;
    this.logger = logger;
  }

  async createBlogPost(input: unknown, actorId?: string): Promise<BlogPostDoc> {
    const validated = validateCreateBlogPost(input);
    const post = await this.blogRepo.create(validated, actorId);

    await this.hooks.emit(BLOG_EVENTS.CREATED, { post, actorId });
    this.logger.info("Blog post created", { id: post.id, slug: post.slug, actorId });

    return post;
  }

  async updateBlogPost(id: string, input: unknown, actorId?: string): Promise<BlogPostDoc> {
    const validated = validateUpdateBlogPost(input);
    const post = await this.blogRepo.update(id, validated, actorId);

    await this.hooks.emit(BLOG_EVENTS.UPDATED, { post, actorId });
    this.logger.info("Blog post updated", {
      id: post.id,
      slug: post.slug,
      version: post.version,
      actorId,
    });

    return post;
  }

  async deleteBlogPost(id: string, actorId?: string): Promise<void> {
    const existing = await this.blogRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Blog post '${id}' not found`);
    }

    await this.blogRepo.deleteById(id);
    await this.hooks.emit(BLOG_EVENTS.DELETED, { id, slug: existing.slug, actorId });
    this.logger.info("Blog post deleted", { id, slug: existing.slug, actorId });
  }

  async getBlogPostById(id: string): Promise<BlogPostDoc | null> {
    return this.blogRepo.findById(id);
  }

  async getBlogPostBySlug(slug: string, canViewDraft = false): Promise<BlogPostDoc | null> {
    const post = await this.blogRepo.findBySlug(slug);
    if (!post) {
      return null;
    }
    if (post.status === "draft" && !canViewDraft) {
      return null;
    }
    return post;
  }

  async listBlogPosts(
    query?: unknown,
    canViewDraft = false,
  ): Promise<PaginatedResult<BlogPostDoc>> {
    const filter = canViewDraft ? {} : { status: "published" as const };
    return this.blogRepo.list(query, filter);
  }

  async searchBlogPosts(
    searchQuery: string,
    paginationQuery?: unknown,
  ): Promise<PaginatedResult<BlogPostDoc>> {
    return this.blogRepo.search(searchQuery, paginationQuery, { status: "published" });
  }

  async getBlogPostVersions(postId: string): Promise<BlogPostVersionDoc[]> {
    return this.blogRepo.listVersions(postId);
  }
}
