import type { IDatabase, ILogger } from "@cms/core";
import { parseObjectId } from "@cms/core";
import type { Collection, Document } from "mongodb";
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

export interface Page extends Document {
  _id?: string;
  title: string;
  slug: string;
  blocks: PageBlock[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PageVersion extends Document {
  _id?: string;
  postId: any;
  versionNumber: number;
  data: Page;
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

  async find(filter: Partial<Page> = {}, projection?: any): Promise<Page[]> {
    let cursor = this.pagesCollection.find(filter);
    if (projection) {
      cursor = cursor.project(projection);
    }
    return cursor.toArray();
  }

  async findById(id: string): Promise<Page | null> {
    try {
      const objectId = parseObjectId(id);
      return await this.pagesCollection.findOne({ _id: objectId } as any);
    } catch {
      return null;
    }
  }

  async findBySlug(slug: string): Promise<Page | null> {
    return this.pagesCollection.findOne({ slug } as any);
  }

  async findByIdOrSlug(idOrSlug: string): Promise<Page | null> {
    let page = await this.findById(idOrSlug);
    if (!page) {
      page = await this.findBySlug(idOrSlug);
    }
    return page;
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const filter: any = { slug };
    if (excludeId) {
      try {
        filter._id = { $ne: parseObjectId(excludeId) };
      } catch {
        // If excludeId is invalid, don't add to filter
      }
    }
    const count = await this.pagesCollection.countDocuments(filter);
    return count > 0;
  }

  async create(pageData: Omit<Page, "createdAt" | "updatedAt">): Promise<Page> {
    const newPage: Page = {
      ...pageData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Page;

    const result = await this.pagesCollection.insertOne(newPage as any);
    return {
      ...newPage,
      _id: result.insertedId.toString(),
    };
  }

  async saveVersionSnapshot(page: Page, savedByUserId: string | null): Promise<void> {
    try {
      const currentVersionCount = await this.versionsCollection.countDocuments({ postId: page._id } as any);
      await this.versionsCollection.insertOne({
        postId: page._id,
        versionNumber: currentVersionCount + 1,
        data: page,
        savedBy: savedByUserId,
        createdAt: new Date(),
      } as any);
    } catch (err) {
      this.logger.error(err, "Failed to write page version snapshot");
    }
  }

  async update(id: string, updateData: Partial<Page>): Promise<Page | null> {
    const objectId = parseObjectId(id);
    const updatedPage = {
      ...updateData,
      updatedAt: new Date(),
    };

    const result = await this.pagesCollection.findOneAndUpdate(
      { _id: objectId } as any,
      { $set: updatedPage } as any,
      { returnDocument: "after" }
    );

    return result as any;
  }

  async delete(id: string): Promise<boolean> {
    const objectId = parseObjectId(id);
    const result = await this.pagesCollection.deleteOne({ _id: objectId } as any);
    return result.deletedCount > 0;
  }
}
