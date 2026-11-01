import type { ICache, IHookManager, ILogger, PaginatedResult } from "@cms/core";
import { EVENTS, NotFoundError } from "@cms/core";
import type { PageDoc, PageVersionDoc } from "./domain/page.rules.js";
import { validateCreatePage, validateUpdatePage } from "./domain/page.rules.js";
import type { PagesRepository } from "./repositories/pagesRepository.js";

export class PageService {
  private readonly pagesRepo: PagesRepository;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;
  private readonly cache?: ICache | undefined;

  constructor(pagesRepo: PagesRepository, hooks: IHookManager, logger: ILogger, cache?: ICache) {
    this.pagesRepo = pagesRepo;
    this.hooks = hooks;
    this.logger = logger;
    this.cache = cache;
  }

  async createPage(input: unknown, actorId?: string): Promise<PageDoc> {
    const validated = validateCreatePage(input);
    const page = await this.pagesRepo.create(validated, actorId);

    if (this.cache) {
      await this.cache.del(
        `cms:pages:slug:${page.slug}`,
        "cms:pages:home",
        "cms:pages:slug:home",
        "cms:pages:slug:index",
      );
    }

    await this.hooks.emit(EVENTS.PAGE.CREATED, {
      pageId: page.id,
      slug: page.slug,
      status: page.status,
      actorId,
    });

    this.logger.info("Page created", { id: page.id, slug: page.slug });
    return page;
  }

  async updatePage(id: string, input: unknown, actorId?: string): Promise<PageDoc> {
    const existing = await this.pagesRepo.findById(id);
    const validated = validateUpdatePage(input);
    const page = await this.pagesRepo.update(id, validated, actorId);

    if (this.cache) {
      const keysToInvalidate = [
        `cms:pages:slug:${page.slug}`,
        "cms:pages:home",
        "cms:pages:slug:home",
        "cms:pages:slug:index",
      ];
      if (existing && existing.slug !== page.slug) {
        keysToInvalidate.push(`cms:pages:slug:${existing.slug}`);
      }
      await this.cache.del(...keysToInvalidate);
    }

    await this.hooks.emit(EVENTS.PAGE.UPDATED, {
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

    if (this.cache) {
      await this.cache.del(
        `cms:pages:slug:${existing.slug}`,
        "cms:pages:home",
        "cms:pages:slug:home",
        "cms:pages:slug:index",
      );
    }

    await this.hooks.emit(EVENTS.PAGE.DELETED, {
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
    if (canViewDraft || !this.cache) {
      if (slug === "home" || slug === "index") {
        const homePage = await this.pagesRepo.findHomePage();
        if (homePage) {
          if (homePage.status === "draft" && !canViewDraft) return null;
          return homePage;
        }
      }

      const page = await this.pagesRepo.findBySlug(slug);
      if (!page) {
        return null;
      }
      if (page.status === "draft" && !canViewDraft) {
        return null;
      }
      return page;
    }

    const key = `cms:pages:slug:${slug}`;
    return this.cache.getOrSet<PageDoc | null>(
      key,
      async () => {
        if (slug === "home" || slug === "index") {
          const homePage = await this.pagesRepo.findHomePage();
          if (homePage) {
            if (homePage.status === "draft") return null;
            return homePage;
          }
        }

        const page = await this.pagesRepo.findBySlug(slug);
        if (!page || page.status === "draft") {
          return null;
        }
        return page;
      },
      3600,
    );
  }

  async getHomePage(canViewDraft = false): Promise<PageDoc | null> {
    if (canViewDraft || !this.cache) {
      const page = await this.pagesRepo.findHomePage();
      if (!page) return null;
      if (page.status === "draft" && !canViewDraft) return null;
      return page;
    }

    return this.cache.getOrSet<PageDoc | null>(
      "cms:pages:home",
      async () => {
        const page = await this.pagesRepo.findHomePage();
        if (!page || page.status === "draft") return null;
        return page;
      },
      3600,
    );
  }

  async listPages(
    query?: {
      page?: unknown;
      limit?: unknown;
      status?: unknown;
      pageType?: unknown;
      search?: unknown;
    },
    canViewDraft = false,
  ): Promise<PaginatedResult<PageDoc>> {
    const filter: Record<string, unknown> = {};

    if (!canViewDraft) {
      filter["status"] = "published";
    } else if (query?.status && (query.status === "draft" || query.status === "published")) {
      filter["status"] = query.status;
    }

    if (query?.pageType && (query.pageType === "standard" || query.pageType === "home")) {
      filter["pageType"] = query.pageType;
    }

    if (typeof query?.search === "string" && query.search.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter["$or"] = [
        { title: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
      ];
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
