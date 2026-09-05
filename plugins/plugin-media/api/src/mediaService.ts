import type { IHookManager, ILogger, PaginatedResult } from "@cms/core";
import { EVENTS, NotFoundError } from "@cms/core";
import {
  generateStorageKey,
  sanitizeFilename,
  validateMediaFileSize,
  validateMediaMimeType,
} from "./domain/media.rules.js";
import type { MediaDoc, MediaRepository } from "./repositories/mediaRepository.js";
import type { IStorageAdapter } from "./storageAdapter.js";

export class MediaService {
  private readonly mediaRepo: MediaRepository;
  private readonly storageAdapter: IStorageAdapter;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;

  constructor(
    mediaRepo: MediaRepository,
    storageAdapter: IStorageAdapter,
    hooks: IHookManager,
    logger: ILogger,
  ) {
    this.mediaRepo = mediaRepo;
    this.storageAdapter = storageAdapter;
    this.hooks = hooks;
    this.logger = logger;
  }

  async uploadFile(params: {
    filename: string;
    buffer: Buffer | Uint8Array;
    mimeType: string;
    uploaderId: string;
  }): Promise<MediaDoc> {
    // 1. Validate MIME type
    const validatedMimeType = validateMediaMimeType(params.mimeType);

    // 2. Validate file size
    validateMediaFileSize(params.buffer.length);

    // 3. Sanitize filename & generate key
    const sanitizedFilename = sanitizeFilename(params.filename);
    const storageKey = generateStorageKey(sanitizedFilename);

    // 4. Upload to storage
    const uploadResult = await this.storageAdapter.upload(
      storageKey,
      params.buffer,
      validatedMimeType,
    );

    // 5. Persist to DB
    const mediaDoc = await this.mediaRepo.create({
      filename: sanitizedFilename,
      key: uploadResult.key,
      url: uploadResult.url,
      mimeType: validatedMimeType,
      size: uploadResult.size,
      uploaderId: params.uploaderId,
    });

    // 6. Emit hook event
    await this.hooks.emit(EVENTS.MEDIA.FILE_UPLOADED, {
      mediaId: mediaDoc.id,
      filename: mediaDoc.filename,
      key: mediaDoc.key,
      url: mediaDoc.url,
      size: mediaDoc.size,
      actorId: params.uploaderId,
    });

    this.logger.info("Media file uploaded", {
      id: mediaDoc.id,
      key: mediaDoc.key,
      size: mediaDoc.size,
    });

    return mediaDoc;
  }

  async deleteMedia(id: string, actorId?: string): Promise<void> {
    const doc = await this.mediaRepo.findById(id);
    if (!doc) {
      throw new NotFoundError("Media file not found");
    }

    // Fail-closed deletion order: Storage first, then DB
    await this.storageAdapter.delete(doc.key);
    await this.mediaRepo.deleteById(id);

    await this.hooks.emit(EVENTS.MEDIA.FILE_DELETED, {
      mediaId: id,
      key: doc.key,
      ...(actorId !== undefined ? { actorId } : {}),
    });

    this.logger.info("Media file deleted", { id, key: doc.key });
  }

  async getMediaById(id: string): Promise<MediaDoc> {
    const doc = await this.mediaRepo.findById(id);
    if (!doc) {
      throw new NotFoundError("Media file not found");
    }
    return doc;
  }

  async listMedia(query?: { page?: unknown; limit?: unknown }): Promise<PaginatedResult<MediaDoc>> {
    return this.mediaRepo.list(query);
  }
}
