import type { RedirectsService } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PAGES_PERMISSIONS } from "./domain/page.rules.js";
import type { PageService } from "./pageService.js";

export class PageController {
  private readonly pageService: PageService;
  private readonly redirectsService: RedirectsService;

  constructor(pageService: PageService, redirectsService: RedirectsService) {
    this.pageService = pageService;
    this.redirectsService = redirectsService;
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const perms = request.user?.permissions || [];
    const canViewDraft = Boolean(
      perms.includes("*") ||
      perms.includes(PAGES_PERMISSIONS.READ_DRAFT) ||
      perms.includes(PAGES_PERMISSIONS.WRITE) ||
      perms.includes("pages:*"),
    );
    const result = await this.pageService.listPages(
      request.query as Record<string, unknown>,
      canViewDraft,
    );
    return reply.send(result);
  }

  async getBySlug(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { slug } = (request.params as { slug?: string }) ?? {};
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
    }

    if (page) {
      return reply.send(page);
    }

    return reply.status(404).send({ error: "Page not found" });
  }

  async search(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const queryParams = (request.query as Record<string, unknown>) ?? {};
    const query = typeof queryParams["q"] === "string" ? queryParams["q"] : "";
    const result = await this.pageService.searchPages(query, queryParams);
    return reply.send(result);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const actorId = request.user?.id;
    const page = await this.pageService.createPage(request.body, actorId);
    return reply.status(201).send(page);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = (request.params as { id?: string }) ?? {};
    const actorId = request.user?.id;
    const page = await this.pageService.updatePage(id ?? "", request.body, actorId);
    return reply.send(page);
  }

  async deleteById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = (request.params as { id?: string }) ?? {};
    const actorId = request.user?.id;
    await this.pageService.deletePage(id ?? "", actorId);
    return reply.status(204).send();
  }

  async getVersions(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = (request.params as { id?: string }) ?? {};
    const versions = await this.pageService.getPageVersions(id ?? "");
    return reply.send(versions);
  }
}
