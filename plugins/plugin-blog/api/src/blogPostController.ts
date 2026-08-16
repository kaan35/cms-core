import type { RedirectsService } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { BlogPostService } from "./blogPostService.js";
import { BLOG_PERMISSIONS } from "./domain/blogPost.rules.js";

export class BlogPostController {
  private readonly blogService: BlogPostService;
  private readonly redirectsService: RedirectsService;

  constructor(blogService: BlogPostService, redirectsService: RedirectsService) {
    this.blogService = blogService;
    this.redirectsService = redirectsService;
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const perms = request.user?.permissions || [];
    const canViewDraft = Boolean(
      perms.includes("*") ||
      perms.includes(BLOG_PERMISSIONS.READ_DRAFT) ||
      perms.includes(BLOG_PERMISSIONS.WRITE) ||
      perms.includes("blog:*"),
    );
    const result = await this.blogService.listBlogPosts(
      request.query as Record<string, unknown>,
      canViewDraft,
    );
    return reply.send(result);
  }

  async getBySlug(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { slug } = (request.params as { slug?: string }) ?? {};
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
    }

    if (post) {
      return reply.send(post);
    }

    return reply.status(404).send({ error: "Blog post not found" });
  }

  async search(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const queryParams = (request.query as Record<string, unknown>) ?? {};
    const query = typeof queryParams["q"] === "string" ? queryParams["q"] : "";
    const result = await this.blogService.searchBlogPosts(query, queryParams);
    return reply.send(result);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const actorId = request.user?.id;
    const post = await this.blogService.createBlogPost(request.body, actorId);
    return reply.status(201).send(post);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = (request.params as { id?: string }) ?? {};
    const actorId = request.user?.id;
    const post = await this.blogService.updateBlogPost(id ?? "", request.body, actorId);
    return reply.send(post);
  }

  async deleteById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = (request.params as { id?: string }) ?? {};
    const actorId = request.user?.id;
    await this.blogService.deleteBlogPost(id ?? "", actorId);
    return reply.status(204).send();
  }

  async getVersions(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = (request.params as { id?: string }) ?? {};
    const versions = await this.blogService.getBlogPostVersions(id ?? "");
    return reply.send(versions);
  }
}
