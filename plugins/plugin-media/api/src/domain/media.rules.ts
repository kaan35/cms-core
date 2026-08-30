import { PERMISSIONS, ValidationError, validateWithSchema } from "@cms/core";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";

export const ALLOWED_MEDIA_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

export const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const MEDIA_PERMISSIONS = {
  READ: PERMISSIONS.MEDIA.READ,
  WRITE: PERMISSIONS.MEDIA.WRITE,
} as const;

export function validateMediaMimeType(mimeTypeRaw: string): AllowedMediaMimeType {
  const mimeType = mimeTypeRaw.trim().toLowerCase();
  if (!ALLOWED_MEDIA_MIME_TYPES.includes(mimeType as AllowedMediaMimeType)) {
    throw new ValidationError(
      `Invalid file type '${mimeTypeRaw}'. Allowed types: ${ALLOWED_MEDIA_MIME_TYPES.join(", ")}`,
    );
  }
  return mimeType as AllowedMediaMimeType;
}

export function validateMediaFileSize(size: number): void {
  if (typeof size !== "number" || Number.isNaN(size) || size <= 0) {
    throw new ValidationError("Invalid file size");
  }
  if (size > MAX_MEDIA_FILE_SIZE) {
    throw new ValidationError(
      `File size (${(size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of 10MB`,
    );
  }
}

export function sanitizeFilename(rawFilename: string): string {
  // Extract basename without any directory path traversal characters
  const base = path.basename(rawFilename.replace(/\\/g, "/"));

  // Keep only alphanumeric, dots, hyphens, and underscores; replace whitespace with dash
  const sanitized = base.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.\-_]/g, "");

  // If sanitized name has no valid alphanumeric base or consists purely of dots/symbols
  if (!sanitized || /^\.+$/.test(sanitized) || !/[a-zA-Z0-9]/.test(sanitized)) {
    return "upload.bin";
  }

  return sanitized;
}

export function generateStorageKey(filename: string): string {
  const safeName = sanitizeFilename(filename);
  const uuid = randomUUID();
  return `${uuid}-${safeName}`;
}

// Zod Ingress Schemas
export const UpdateMediaSchema = z.object({
  alt: z.string().trim().optional(),
  caption: z.string().trim().optional(),
});

export type UpdateMediaInput = z.infer<typeof UpdateMediaSchema>;

export function validateUpdateMedia(input: unknown): UpdateMediaInput {
  return validateWithSchema(UpdateMediaSchema, input, "Invalid media update payload");
}
