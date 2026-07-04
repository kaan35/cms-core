import type { IDatabase, ILogger } from "@cms/core";
import { parseObjectId } from "@cms/core";
import type { Collection, Filter, UpdateFilter, WithId } from "mongodb";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "./constants.ts";

export interface BlogPost {
  title: string;
  slug: string;
  summary: string;
  content: string;
  status: "draft" | "published";
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPostVersion {
  postId: ObjectId | string;
  versionNumber: number;
  data: WithId<BlogPost>;
  savedBy: string | null;
  createdAt: Date;
}

export class BlogPostsRepository {
  private readonly db: IDatabase;
  private readonly logger: ILogger;
  private readonly blogPostsCollection: Collection<BlogPost>;
  private readonly versionsCollection: Collection<BlogPostVersion>;

  constructor(db: IDatabase, logger: ILogger) {
    this.db = db;
    this.logger = logger;
    this.blogPostsCollection = this.db.getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS);
    this.versionsCollection = this.db.getCollection<BlogPostVersion>(COLLECTIONS.POST_VERSIONS);
  }

  async find(filter: Filter<BlogPost> = {}): Promise<WithId<BlogPost>[]> {
    return this.blogPostsCollection.find(filter).sort({ createdAt: -1 }).toArray();
  }

  async findById(id: string): Promise<WithId<BlogPost> | null> {
    try {
      const objectId = parseObjectId(id);
      return await this.blogPostsCollection.findOne({
        _id: objectId,
      } as unknown as Filter<BlogPost>);
    } catch {
      return null;
    }
  }

  async findBySlug(slug: string): Promise<WithId<BlogPost> | null> {
    return this.blogPostsCollection.findOne({ slug } as Filter<BlogPost>);
  }

  async findByIdOrSlug(idOrSlug: string): Promise<WithId<BlogPost> | null> {
    let post = await this.findById(idOrSlug);
    if (!post) {
      post = await this.findBySlug(idOrSlug);
    }
    return post;
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Filter<BlogPost> & { _id?: unknown } = { slug };
    if (excludeId) {
      try {
        filter._id = { $ne: parseObjectId(excludeId) };
      } catch {
        // If excludeId is invalid, don't add to filter
      }
    }
    const count = await this.blogPostsCollection.countDocuments(filter as Filter<BlogPost>);
    return count > 0;
  }

  async create(postData: Omit<BlogPost, "createdAt" | "updatedAt">): Promise<WithId<BlogPost>> {
    const newPost: BlogPost = {
      ...postData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.blogPostsCollection.insertOne(newPost as any);
    return { ...newPost, _id: result.insertedId } as WithId<BlogPost>;
  }

  async saveVersionSnapshot(post: WithId<BlogPost>, savedByUserId: string | null): Promise<void> {
    try {
      const versionCount = await this.versionsCollection.countDocuments({
        postId: post._id,
      } as Filter<BlogPostVersion>);
      await this.versionsCollection.insertOne({
        postId: post._id,
        versionNumber: versionCount + 1,
        data: post,
        savedBy: savedByUserId,
        createdAt: new Date(),
      } as unknown as BlogPostVersion);
    } catch (err) {
      this.logger.error(err, "Failed to write blog post version snapshot");
    }
  }

  async update(id: string, updateData: Partial<BlogPost>): Promise<WithId<BlogPost> | null> {
    const objectId = parseObjectId(id);
    const updatedPost = {
      ...updateData,
      updatedAt: new Date(),
    };

    return await this.blogPostsCollection.findOneAndUpdate(
      { _id: objectId } as unknown as Filter<BlogPost>,
      { $set: updatedPost } as UpdateFilter<BlogPost>,
      { returnDocument: "after" },
    );
  }

  async delete(id: string): Promise<boolean> {
    const objectId = parseObjectId(id);
    const result = await this.blogPostsCollection.deleteOne({
      _id: objectId,
    } as unknown as Filter<BlogPost>);
    return result.deletedCount > 0;
  }
}
