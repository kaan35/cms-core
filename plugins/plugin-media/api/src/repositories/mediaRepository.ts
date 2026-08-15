import type { ICollection, IDatabase, PaginatedResult } from "@cms/core";
import { buildPaginatedResult, parsePaginationQuery } from "@cms/core";
import { randomUUID } from "node:crypto";

export interface MediaDoc {
  [key: string]: unknown;
  id: string;
  filename: string;
  key: string;
  url: string;
  mimeType: string;
  size: number;
  uploaderId: string;
  createdAt: string;
  updatedAt: string;
}

export class MediaRepository {
  private readonly collection: ICollection<MediaDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<MediaDoc>("cms_media");
  }

  async create(data: {
    filename: string;
    key: string;
    url: string;
    mimeType: string;
    size: number;
    uploaderId: string;
  }): Promise<MediaDoc> {
    const now = new Date().toISOString();
    const doc: MediaDoc = {
      id: randomUUID(),
      filename: data.filename,
      key: data.key,
      url: data.url,
      mimeType: data.mimeType,
      size: data.size,
      uploaderId: data.uploaderId,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async findById(id: string): Promise<MediaDoc | null> {
    return this.collection.findOne({ id });
  }

  async findByKey(key: string): Promise<MediaDoc | null> {
    return this.collection.findOne({ key });
  }

  async deleteById(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  async list(query?: { page?: unknown; limit?: unknown }): Promise<PaginatedResult<MediaDoc>> {
    const { page, limit } = parsePaginationQuery(query ?? {});
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.collection.find({}, { skip, limit, sort: { createdAt: -1 } }),
      this.collection.countDocuments({}),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }
}
