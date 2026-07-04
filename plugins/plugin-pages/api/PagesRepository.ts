import type { IDatabase, ILogger } from "@cms/core";
import { parseObjectId } from "@cms/core";
import type { Collection, Filter, UpdateFilter, WithId } from "mongodb";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "./constants.ts";

export interface PageBlock {
  id: string;
  type: "hero" | "text" | "form" | "blog_posts";
  title?: string;
  subtitle?: string;
  content?: string;
  formId?: string;
  count?: number;
}

export interface Page {
  title: string;
  slug: string;
  status: "draft" | "published";
  blocks: PageBlock[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PageVersion {
  pageId: ObjectId | string;
  versionNumber: number;
  data: WithId<Page>;
  savedBy: string | null;
  createdAt: Date;
}

export class PagesRepository {
  private readonly db: IDatabase;
  private readonly logger: ILogger;
  private readonly pagesCollection: Collection<Page>;
  private readonly versionsCollection: Collection<PageVersion>;

  constructor(db: IDatabase, logger: ILogger) {
    this.db = db;
    this.logger = logger;
    this.pagesCollection = this.db.getCollection<Page>(COLLECTIONS.PAGES);
    this.versionsCollection = this.db.getCollection<PageVersion>(COLLECTIONS.POST_VERSIONS);
  }

  async find(filter: Filter<Page> = {}, projection?: any): Promise<WithId<Page>[]> {
    let cursor = this.pagesCollection.find(filter);
    if (projection) {
      cursor = cursor.project(projection);
    }
    return await cursor.toArray();
  }

  async findById(id: string): Promise<WithId<Page> | null> {
    try {
      const objectId = parseObjectId(id);
      return await this.pagesCollection.findOne({ _id: objectId } as unknown as Filter<Page>);
    } catch {
      return null;
    }
  }

  async findBySlug(slug: string): Promise<WithId<Page> | null> {
    return await this.pagesCollection.findOne({ slug } as Filter<Page>);
  }

  async findByIdOrSlug(idOrSlug: string): Promise<WithId<Page> | null> {
    let page = await this.findById(idOrSlug);
    if (!page) {
      page = await this.findBySlug(idOrSlug);
    }
    return page;
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<Page> & { _id?: unknown } = { slug };
    if (excludeId) {
      try {
        filter._id = { $ne: parseObjectId(excludeId) };
      } catch {
        // If excludeId is invalid, don't add to filter
      }
    }
    const count = await this.pagesCollection.countDocuments(filter as Filter<Page>);
    return count > 0;
  }

  async create(pageData: Omit<Page, "createdAt" | "updatedAt">): Promise<WithId<Page>> {
    const newPage: Page = {
      ...pageData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.pagesCollection.insertOne(newPage as any);
    return { ...newPage, _id: result.insertedId } as WithId<Page>;
  }

  async saveVersionSnapshot(page: WithId<Page>, savedByUserId: string | null): Promise<void> {
    try {
      const currentVersionCount = await this.versionsCollection.countDocuments({
        pageId: page._id,
      } as Filter<PageVersion>);
      await this.versionsCollection.insertOne({
        pageId: page._id,
        versionNumber: currentVersionCount + 1,
        data: page,
        savedBy: savedByUserId,
        createdAt: new Date(),
      } as unknown as PageVersion);
    } catch (err) {
      this.logger.error(err, "Failed to write page version snapshot");
    }
  }

  async update(id: string, updateData: Partial<Page>): Promise<WithId<Page> | null> {
    const objectId = parseObjectId(id);
    const updatedPage = {
      ...updateData,
      updatedAt: new Date(),
    };

    return await this.pagesCollection.findOneAndUpdate(
      { _id: objectId } as unknown as Filter<Page>,
      { $set: updatedPage } as UpdateFilter<Page>,
      { returnDocument: "after" },
    );
  }

  async delete(id: string): Promise<boolean> {
    const objectId = parseObjectId(id);
    const result = await this.pagesCollection.deleteOne({
      _id: objectId,
    } as unknown as Filter<Page>);
    return result.deletedCount > 0;
  }
}
