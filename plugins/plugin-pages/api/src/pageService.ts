import type { HookManager, ILogger, PaginatedResult } from "@cms/core";
import { NotFoundError } from "@cms/core";
import type { PageDoc, PageVersionDoc } from "./domain/page.rules.js";
import { validateCreatePage, validateUpdatePage } from "./domain/page.rules.js";
import type { PagesRepository } from "./repositories/pagesRepository.js";

export class PageService {
  private readonly pagesRepo: PagesRepository;
  private readonly hooks: HookManager;
  private readonly logger: ILogger;

  constructor(pagesRepo: PagesRepository, hooks: HookManager, logger: ILogger) {
    this.pagesRepo = pagesRepo;
    this.hooks = hooks;
    this.logger = logger;
  }

  async createPage(input: unknown, actorId?: string): Promise<PageDoc> {
    const validated = validateCreatePage(input);
    const page = await this.pagesRepo.create(validated, actorId);

    await this.hooks.emit("page.created", {
      pageId: page.id,
      slug: page.slug,
      status: page.status,
      actorId,
    });

    this.logger.info("Page created", { id: page.id, slug: page.slug });
    return page;
  }

  async updatePage(id: string, input: unknown, actorId?: string): Promise<PageDoc> {
    const validated = validateUpdatePage(input);
    const page = await this.pagesRepo.update(id, validated, actorId);

    await this.hooks.emit("page.updated", {
      pageId: page.id,
      slug: page.slug,
      status: page.status,
      version: page.version,
      actorId,
    });

    this.logger.info("Page updated", { id: page.id, slug: page.slug, version: page.version });
    return page;
  }

  async deletePage(id: string, actorId?: string): Promise<void> {
    const existing = await this.pagesRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Page with ID '${id}' not found`);
    }

    await this.pagesRepo.deleteById(id);

    await this.hooks.emit("page.deleted", {
      pageId: id,
      slug: existing.slug,
      actorId,
    });

    this.logger.info("Page deleted", { id, slug: existing.slug });
  }

  async getPageById(id: string): Promise<PageDoc> {
    const page = await this.pagesRepo.findById(id);
    if (!page) {
      throw new NotFoundError(`Page with ID '${id}' not found`);
    }
    return page;
  }

  async getPageBySlug(slug: string, canViewDraft = false): Promise<PageDoc | null> {
    const page = await this.pagesRepo.findBySlug(slug);
    if (!page) {
      return null;
    }
    if (page.status === "draft" && !canViewDraft) {
      return null;
    }
    return page;
  }

  async listPages(
    query?: { page?: unknown; limit?: unknown; status?: unknown },
    canViewDraft = false,
  ): Promise<PaginatedResult<PageDoc>> {
    const filter: Record<string, unknown> = {};

    if (!canViewDraft) {
      filter["status"] = "published";
    } else if (query?.status && (query.status === "draft" || query.status === "published")) {
      filter["status"] = query.status;
    }

    return this.pagesRepo.list(filter, query);
  }

  async searchPages(
    searchQuery: string,
    paginationQuery?: unknown,
  ): Promise<PaginatedResult<PageDoc>> {
    return this.pagesRepo.search(searchQuery, paginationQuery, { status: "published" });
  }

  async getPageVersions(pageId: string): Promise<PageVersionDoc[]> {
    const existing = await this.pagesRepo.findById(pageId);
    if (!existing) {
      throw new NotFoundError(`Page with ID '${pageId}' not found`);
    }
    return this.pagesRepo.listVersions(pageId);
  }
}
