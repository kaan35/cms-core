import type { CoreServices } from "@cms/core";
import type { FastifyInstance } from "fastify";
import { MediaController } from "./mediaController.js";
import { MediaService } from "./mediaService.js";
import { MediaRepository } from "./repositories/mediaRepository.js";
import { S3StorageAdapter } from "./storageAdapter.js";

export { MEDIA_PERMISSIONS } from "./domain/media.rules.js";
export type { AllowedMediaMimeType, UpdateMediaInput } from "./domain/media.rules.js";
export { MediaService } from "./mediaService.js";
export { initMediaMigration } from "./migrations/202601030000_init_media.js";
export { MediaRepository } from "./repositories/mediaRepository.js";
export type { MediaDoc, MediaFolderDoc } from "./repositories/mediaRepository.js";
export { S3StorageAdapter } from "./storageAdapter.js";
export type { IStorageAdapter, S3StorageConfig, StorageUploadResult } from "./storageAdapter.js";

export async function registerMediaPlugin(
  app: FastifyInstance,
  services: CoreServices,
): Promise<void> {
  const { db, logger, hooks, config } = services;

  // S3 / MinIO configuration from environment variables
  const s3Endpoint = config.getOrDefault("S3_ENDPOINT", "http://localhost:9000");
  const s3Region = config.getOrDefault("S3_REGION", "us-east-1");
  const s3Bucket = config.getOrDefault("S3_BUCKET", "cms-media");
  const s3AccessKeyId = config.getOrDefault("S3_ACCESS_KEY_ID", "minioadmin");
  const s3SecretAccessKey = config.getOrDefault("S3_SECRET_ACCESS_KEY", "minioadmin");
  const s3PublicUrl = config.getOrDefault("S3_PUBLIC_URL", "");
  const s3ForcePathStyle = config.getBoolean("S3_FORCE_PATH_STYLE", true);

  const mediaRepo = new MediaRepository(db);

  const storageAdapter = new S3StorageAdapter({
    bucket: s3Bucket,
    endpoint: s3Endpoint,
    region: s3Region,
    accessKeyId: s3AccessKeyId || undefined,
    secretAccessKey: s3SecretAccessKey || undefined,
    publicUrl: s3PublicUrl || undefined,
    forcePathStyle: s3ForcePathStyle,
  });

  const mediaService = new MediaService(mediaRepo, storageAdapter, hooks, logger);
  const controller = new MediaController(mediaService);

  const { registerMediaRoutes } = await import("./routes.js");
  registerMediaRoutes(app, controller);
}
