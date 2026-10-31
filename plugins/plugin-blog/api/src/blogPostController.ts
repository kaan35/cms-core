import type { IRedirectsService } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { BlogPostService } from "./blogPostService.js";
import {
  BLOG_PERMISSIONS,
  type BlogQuery,
  type CreateBlogPostInput,
  type PostIdParam,
  type PostSlugParam,
  type UpdateBlogPostInput,
} from "./domain/blogPost.rules.js";

export class BlogPostController {
  private readonly blogService: BlogPostService;
  private readonly redirectsService: IRedirectsService;

  constructor(blogService: BlogPostService, redirectsService: IRedirectsService) {
    this.blogService = blogService;
    this.redirectsService = redirectsService;
  }

  async list(
    request: FastifyRequest<{ Querystring: BlogQuery }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const perms = request.user?.permissions || [];
    const canViewDraft = Boolean(
      perms.includes("*") ||
      perms.includes(BLOG_PERMISSIONS.READ_DRAFT) ||
      perms.includes(BLOG_PERMISSIONS.WRITE) ||
      perms.includes("blog:*"),
    );
    const result = await this.blogService.listBlogPosts(request.query, canViewDraft);
    return reply.send(result);
  }

  async getBySlug(
    request: FastifyRequest<{ Params: PostSlugParam }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { slug } = request.params;
    if (!slug) {
      return reply.status(404).send({ error: "Blog post not found" });
    }

    const perms = request.user?.permissions || [];
    const canViewDraft = Boolean(
      perms.includes("*") ||
      perms.includes(BLOG_PERMISSIONS.READ_DRAFT) ||
      perms.includes(BLOG_PERMISSIONS.WRITE) ||
      perms.includes("blog:*"),
    );

    let post = await this.blogService.getBlogPostBySlug(slug, canViewDraft);

    if (!post) {
      // Check if slug was redirected
      const redirect = await this.redirectsService.findByFrom(slug);
      if (redirect) {
        // 301 Permanent Redirect
        return reply.status(301).redirect(`/blog/${redirect.to}`);
      }

      // Fallback: check if param is an ID
      post = await this.blogService.getBlogPostById(slug);
      if (post && post.status === "draft" && !canViewDraft) {
        post = null;
      }
    }

    if (post) {
      return reply.send(post);
    }

    return reply.status(404).send({ error: "Blog post not found" });
  }

  async getById(
    request: FastifyRequest<{ Params: PostIdParam }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = request.params;
    const perms = request.user?.permissions || [];
    const canViewDraft = Boolean(
      perms.includes("*") ||
      perms.includes(BLOG_PERMISSIONS.READ_DRAFT) ||
      perms.includes(BLOG_PERMISSIONS.WRITE) ||
      perms.includes("blog:*"),
    );

    const post = await this.blogService.getBlogPostById(id);
    if (!post || (post.status === "draft" && !canViewDraft)) {
      return reply.status(404).send({ error: "Blog post not found" });
    }

    return reply.send(post);
  }

  async search(
    request: FastifyRequest<{ Querystring: BlogQuery }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const query = request.query.q ?? request.query.search ?? "";
    const result = await this.blogService.searchBlogPosts(query, request.query);
    return reply.send(result);
  }

  async create(
    request: FastifyRequest<{ Body: CreateBlogPostInput }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const actorId = request.user?.id;
    const post = await this.blogService.createBlogPost(request.body, actorId);
    return reply.status(201).send(post);
  }

  async update(
    request: FastifyRequest<{ Params: PostIdParam; Body: UpdateBlogPostInput }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = request.params;
    const actorId = request.user?.id;
    const post = await this.blogService.updateBlogPost(id, request.body, actorId);
    return reply.send(post);
  }

  async deleteById(
    request: FastifyRequest<{ Params: PostIdParam }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = request.params;
    const actorId = request.user?.id;
    await this.blogService.deleteBlogPost(id, actorId);
    return reply.status(204).send();
  }

  async getVersions(
    request: FastifyRequest<{ Params: PostIdParam }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = request.params;
    const versions = await this.blogService.getBlogPostVersions(id);
    return reply.send(versions);
  }
}
