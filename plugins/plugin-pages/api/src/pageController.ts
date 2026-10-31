import type { IRedirectsService } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  PAGES_PERMISSIONS,
  type CreatePageInput,
  type PageIdParam,
  type PageQuery,
  type PageSlugParam,
  type UpdatePageInput,
} from "./domain/page.rules.js";
import type { PageService } from "./pageService.js";

export class PageController {
  private readonly pageService: PageService;
  private readonly redirectsService: IRedirectsService;

  constructor(pageService: PageService, redirectsService: IRedirectsService) {
    this.pageService = pageService;
    this.redirectsService = redirectsService;
  }

  async list(
    request: FastifyRequest<{ Querystring: PageQuery }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const perms = request.user?.permissions || [];
    const canViewDraft = Boolean(
      perms.includes("*") ||
      perms.includes(PAGES_PERMISSIONS.READ_DRAFT) ||
      perms.includes(PAGES_PERMISSIONS.WRITE) ||
      perms.includes("pages:*"),
    );
    const result = await this.pageService.listPages(request.query, canViewDraft);
    return reply.send(result);
  }

  async getHome(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const perms = request.user?.permissions || [];
    const canViewDraft = Boolean(
      perms.includes("*") ||
      perms.includes(PAGES_PERMISSIONS.READ_DRAFT) ||
      perms.includes(PAGES_PERMISSIONS.WRITE) ||
      perms.includes("pages:*"),
    );

    const page = await this.pageService.getHomePage(canViewDraft);
    if (page) {
      return reply.send(page);
    }
    return reply.status(404).send({ error: "Home page not found" });
  }

  async getBySlug(
    request: FastifyRequest<{ Params: PageSlugParam }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { slug } = request.params;
    if (!slug) {
      return reply.status(404).send({ error: "Page not found" });
    }

    const perms = request.user?.permissions || [];
    const canViewDraft = Boolean(
      perms.includes("*") ||
      perms.includes(PAGES_PERMISSIONS.READ_DRAFT) ||
      perms.includes(PAGES_PERMISSIONS.WRITE) ||
      perms.includes("pages:*"),
    );

    let page = await this.pageService.getPageBySlug(slug, canViewDraft);

    if (!page) {
      // Check if slug was redirected
      const redirect = await this.redirectsService.findByFrom(slug);
      if (redirect) {
        // 301 Permanent Redirect
        return reply.status(301).redirect(`/pages/${redirect.to}`);
      }

      // Fallback: check if param is an ID
      page = await this.pageService.getPageById(slug);
      if (page && page.status === "draft" && !canViewDraft) {
        page = null;
      }
    }

    if (page) {
      return reply.send(page);
    }

    return reply.status(404).send({ error: "Page not found" });
  }

  async getById(
    request: FastifyRequest<{ Params: PageIdParam }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = request.params;
    const perms = request.user?.permissions || [];
    const canViewDraft = Boolean(
      perms.includes("*") ||
      perms.includes(PAGES_PERMISSIONS.READ_DRAFT) ||
      perms.includes(PAGES_PERMISSIONS.WRITE) ||
      perms.includes("pages:*"),
    );

    const page = await this.pageService.getPageById(id);
    if (!page || (page.status === "draft" && !canViewDraft)) {
      return reply.status(404).send({ error: "Page not found" });
    }

    return reply.send(page);
  }

  async search(
    request: FastifyRequest<{ Querystring: PageQuery }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const query = request.query.q ?? request.query.search ?? "";
    const result = await this.pageService.searchPages(query, request.query);
    return reply.send(result);
  }

  async create(
    request: FastifyRequest<{ Body: CreatePageInput }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const actorId = request.user?.id;
    const page = await this.pageService.createPage(request.body, actorId);
    return reply.status(201).send(page);
  }

  async update(
    request: FastifyRequest<{ Params: PageIdParam; Body: UpdatePageInput }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = request.params;
    const actorId = request.user?.id;
    const page = await this.pageService.updatePage(id, request.body, actorId);
    return reply.send(page);
  }

  async deleteById(
    request: FastifyRequest<{ Params: PageIdParam }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = request.params;
    const actorId = request.user?.id;
    await this.pageService.deletePage(id, actorId);
    return reply.status(204).send();
  }

  async getVersions(
    request: FastifyRequest<{ Params: PageIdParam }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = request.params;
    const versions = await this.pageService.getPageVersions(id);
    return reply.send(versions);
  }
}
