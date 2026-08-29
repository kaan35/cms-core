import type { ICollection, IDatabase, PaginatedResult, RedirectsService } from "@cms/core";
import {
  assertUniqueSlug,
  buildPaginatedResult,
  generateSlug,
  NotFoundError,
  parsePaginationQuery,
  resolveUpdatedSlug,
  searchPaginated,
} from "@cms/core";
import { randomUUID } from "node:crypto";
import type {
  PageBlock,
  PageDoc,
  PageStatus,
  PageVersionDoc,
  UpdatePageInput,
} from "../domain/page.rules.js";

export class PagesRepository {
  private readonly pagesCollection: ICollection<PageDoc>;
  private readonly versionsCollection: ICollection<PageVersionDoc>;
  private readonly redirectsService: RedirectsService;

  constructor(db: IDatabase, redirectsService: RedirectsService) {
    this.pagesCollection = db.collection<PageDoc>("cms_pages");
    this.versionsCollection = db.collection<PageVersionDoc>("cms_page_versions");
    this.redirectsService = redirectsService;
  }

  async create(
    input: {
      title: string;
      slug?: string | undefined;
      status?: PageStatus | undefined;
      pageType?: "standard" | "home" | undefined;
      blocks: PageBlock[];
      metaTitle?: string | undefined;
      metaDescription?: string | undefined;
    },
    actorId?: string,
  ): Promise<PageDoc> {
    const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.title);
    await assertUniqueSlug(this.pagesCollection, slug);

    const now = new Date().toISOString();
    const pageId = randomUUID();
    const pageType = input.pageType ?? "standard";

    if (pageType === "home") {
      // Invariant: demote any other home page to standard
      const existingHomes = await this.pagesCollection.find({ pageType: "home" });
      for (const h of existingHomes) {
        await this.pagesCollection.updateOne({ id: h.id }, { $set: { pageType: "standard" } });
      }
    }

    const pageDoc: PageDoc = {
      id: pageId,
      title: input.title,
      slug,
      status: input.status ?? "draft",
      pageType,
      blocks: input.blocks,
      ...(input.metaTitle ? { metaTitle: input.metaTitle } : {}),
      ...(input.metaDescription ? { metaDescription: input.metaDescription } : {}),
      version: 1,
      ...(actorId ? { createdBy: actorId, updatedBy: actorId } : {}),
      createdAt: now,
      updatedAt: now,
    };

    await this.pagesCollection.insertOne(pageDoc);

    // Record initial version snapshot
    const versionDoc: PageVersionDoc = {
      id: randomUUID(),
      pageId,
      version: 1,
      data: {
        title: pageDoc.title,
        slug: pageDoc.slug,
        status: pageDoc.status,
        blocks: pageDoc.blocks,
        ...(pageDoc.metaTitle ? { metaTitle: pageDoc.metaTitle } : {}),
        ...(pageDoc.metaDescription ? { metaDescription: pageDoc.metaDescription } : {}),
        version: 1,
        ...(actorId ? { createdBy: actorId, updatedBy: actorId } : {}),
        createdAt: now,
        updatedAt: now,
      },
      ...(actorId ? { changedBy: actorId } : {}),
      createdAt: now,
    };
    await this.versionsCollection.insertOne(versionDoc);

    return pageDoc;
  }

  async update(id: string, input: UpdatePageInput, actorId?: string): Promise<PageDoc> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Page with ID '${id}' not found`);
    }

    const newSlug = await resolveUpdatedSlug(
      this.pagesCollection,
      existing.slug,
      input,
      existing.title,
      id,
      this.redirectsService,
    );

    const now = new Date().toISOString();
    const nextVersion = existing.version + 1;

    if (input.pageType === "home") {
      // Invariant: demote any other home page to standard
      const existingHomes = await this.pagesCollection.find({ pageType: "home" });
      for (const h of existingHomes) {
        if (h.id !== id) {
          await this.pagesCollection.updateOne({ id: h.id }, { $set: { pageType: "standard" } });
        }
      }
    }

    const updatedDoc: PageDoc = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      slug: newSlug,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.pageType !== undefined ? { pageType: input.pageType } : {}),
      ...(input.blocks !== undefined ? { blocks: input.blocks } : {}),
      ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
      ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription } : {}),
      version: nextVersion,
      ...(actorId ? { updatedBy: actorId } : {}),
      updatedAt: now,
    };

    const { _id, ...setDoc } = updatedDoc as Record<string, unknown>;
    await this.pagesCollection.updateOne({ id }, { $set: setDoc });

    // Save version snapshot
    const versionDoc: PageVersionDoc = {
      id: randomUUID(),
      pageId: id,
      version: nextVersion,
      data: {
        title: updatedDoc.title,
        slug: updatedDoc.slug,
        status: updatedDoc.status,
        blocks: updatedDoc.blocks,
        ...(updatedDoc.metaTitle ? { metaTitle: updatedDoc.metaTitle } : {}),
        ...(updatedDoc.metaDescription ? { metaDescription: updatedDoc.metaDescription } : {}),
        version: nextVersion,
        ...(updatedDoc.createdBy ? { createdBy: updatedDoc.createdBy } : {}),
        ...(actorId ? { updatedBy: actorId } : {}),
        createdAt: existing.createdAt,
        updatedAt: now,
      },
      ...(actorId ? { changedBy: actorId } : {}),
      createdAt: now,
    };
    await this.versionsCollection.insertOne(versionDoc);

    return updatedDoc;
  }

  async findById(id: string): Promise<PageDoc | null> {
    return this.pagesCollection.findOne({ id });
  }

  async findBySlug(slug: string): Promise<PageDoc | null> {
    return this.pagesCollection.findOne({ slug });
  }

  async findHomePage(): Promise<PageDoc | null> {
    const home = await this.pagesCollection.findOne({ pageType: "home" });
    if (home) return home;
    return this.pagesCollection.findOne({ slug: "home" });
  }

  async findByType(pageType: "standard" | "home"): Promise<PageDoc | null> {
    return this.pagesCollection.findOne({ pageType });
  }

  async deleteById(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Page with ID '${id}' not found`);
    }

    await Promise.all([
      this.pagesCollection.deleteOne({ id }),
      this.versionsCollection.deleteOne({ pageId: id }),
    ]);
  }

  async list(
    filter: Record<string, unknown> = {},
    paginationQuery?: unknown,
  ): Promise<PaginatedResult<PageDoc>> {
    const { page, limit } = parsePaginationQuery(paginationQuery ?? {});
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.pagesCollection.find(filter, { skip, limit, sort: { createdAt: -1 } }),
      this.pagesCollection.countDocuments(filter),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async search(
    query: string,
    paginationQuery?: unknown,
    filter: Record<string, unknown> = {},
  ): Promise<PaginatedResult<PageDoc>> {
    return searchPaginated(this.pagesCollection, query, paginationQuery, filter);
  }

  async listVersions(pageId: string): Promise<PageVersionDoc[]> {
    return this.versionsCollection.find({ pageId }, { sort: { version: -1 } });
  }
}
