import type { ICollection, IDatabase, IRedirectsService, PaginatedResult } from "@cms/core";
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
  BlogPostDoc,
  BlogPostStatus,
  BlogPostVersionDoc,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from "../domain/blogPost.rules.js";

export class BlogPostsRepository {
  private readonly postsCollection: ICollection<BlogPostDoc>;
  private readonly versionsCollection: ICollection<BlogPostVersionDoc>;
  private readonly redirectsService: IRedirectsService;

  constructor(db: IDatabase, redirectsService: IRedirectsService) {
    this.postsCollection = db.collection<BlogPostDoc>("cms_blog_posts");
    this.versionsCollection = db.collection<BlogPostVersionDoc>("cms_post_versions");
    this.redirectsService = redirectsService;
  }

  async create(input: CreateBlogPostInput, actorId?: string): Promise<BlogPostDoc> {
    const rawSlug = input.slug?.trim() ? input.slug : generateSlug(input.title);
    const slug = generateSlug(rawSlug);

    await assertUniqueSlug(this.postsCollection, slug);

    const now = new Date().toISOString();
    const doc: BlogPostDoc = {
      id: randomUUID(),
      title: input.title,
      slug,
      summary: input.summary,
      content: input.content,
      coverMediaId: input.coverMediaId,
      status: input.status,
      version: 1,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      createdAt: now,
      updatedAt: now,
      actorId,
    };

    await this.postsCollection.insertOne(doc);

    // Save initial version snapshot
    const versionDoc: BlogPostVersionDoc = {
      id: randomUUID(),
      postId: doc.id,
      version: 1,
      snapshot: structuredClone(doc),
      createdAt: now,
      actorId,
    };
    await this.versionsCollection.insertOne(versionDoc);

    return doc;
  }

  async update(id: string, input: UpdateBlogPostInput, actorId?: string): Promise<BlogPostDoc> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Blog post '${id}' not found`);
    }

    const newSlug = await resolveUpdatedSlug(
      this.postsCollection,
      existing.slug,
      input,
      existing.title,
      id,
      this.redirectsService,
    );

    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

    const updatedDoc: BlogPostDoc = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      slug: newSlug,
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.coverMediaId !== undefined ? { coverMediaId: input.coverMediaId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
      ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription } : {}),
      version: newVersion,
      updatedAt: now,
      actorId: actorId ?? existing.actorId,
    };

    const { _id, ...setDoc } = updatedDoc as Record<string, unknown>;
    await this.postsCollection.updateOne({ id }, { $set: setDoc });

    // Save version snapshot
    const versionDoc: BlogPostVersionDoc = {
      id: randomUUID(),
      postId: id,
      version: newVersion,
      snapshot: structuredClone(updatedDoc),
      createdAt: now,
      actorId,
    };
    await this.versionsCollection.insertOne(versionDoc);

    return updatedDoc;
  }

  async findById(id: string): Promise<BlogPostDoc | null> {
    return this.postsCollection.findOne({ id });
  }

  async findBySlug(slug: string): Promise<BlogPostDoc | null> {
    return this.postsCollection.findOne({ slug });
  }

  async list(
    query?: unknown,
    filter: { status?: BlogPostStatus } = {},
  ): Promise<PaginatedResult<BlogPostDoc>> {
    const { page, limit } = parsePaginationQuery(query);
    const skip = (page - 1) * limit;

    const mongoFilter: Record<string, unknown> = {};
    if (filter.status) {
      mongoFilter["status"] = filter.status;
    }

    const [data, total] = await Promise.all([
      this.postsCollection.find(mongoFilter, {
        skip,
        limit,
        sort: { createdAt: -1 },
      }),
      this.postsCollection.countDocuments(mongoFilter),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async search(
    query: string,
    paginationQuery?: unknown,
    filter: { status?: BlogPostStatus } = {},
  ): Promise<PaginatedResult<BlogPostDoc>> {
    const extraFilter: Record<string, unknown> = {};
    if (filter.status) {
      extraFilter["status"] = filter.status;
    }
    return searchPaginated(this.postsCollection, query, paginationQuery, extraFilter);
  }

  async deleteById(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Blog post '${id}' not found`);
    }
    await this.postsCollection.deleteOne({ id });
  }

  async listVersions(postId: string): Promise<BlogPostVersionDoc[]> {
    return this.versionsCollection.find({ postId }, { sort: { version: -1 } });
  }
}
