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

const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG_MAGIC_BYTES = [0xff, 0xd8, 0xff] as const;
const RIFF_MAGIC_BYTES = [0x52, 0x49, 0x46, 0x46] as const; // "RIFF"
const WEBP_MAGIC_BYTES = [0x57, 0x45, 0x42, 0x50] as const; // "WEBP" at offset 8

function matchesSignature(
  buffer: Buffer | Uint8Array,
  signature: readonly number[],
  offset = 0,
): boolean {
  if (buffer.length < offset + signature.length) {
    return false;
  }
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

// Verifies the binary file header (magic bytes) against the declared MIME type so attackers
// cannot upload HTML/SVG/JS payloads disguised with a spoofed Content-Type: image/png header.
export function validateMediaMagicBytes(
  buffer: Buffer | Uint8Array,
  expectedMimeType: AllowedMediaMimeType,
): void {
  let valid = false;
  if (expectedMimeType === "image/png") {
    valid = matchesSignature(buffer, PNG_MAGIC_BYTES, 0);
  } else if (expectedMimeType === "image/jpeg") {
    valid = matchesSignature(buffer, JPEG_MAGIC_BYTES, 0);
  } else if (expectedMimeType === "image/webp") {
    valid =
      matchesSignature(buffer, RIFF_MAGIC_BYTES, 0) &&
      matchesSignature(buffer, WEBP_MAGIC_BYTES, 8);
  }

  if (!valid) {
    throw new ValidationError(
      `File binary signature (magic bytes) does not match declared MIME type '${expectedMimeType}'`,
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
  alt: z.string().trim().max(255).optional(),
  caption: z.string().trim().max(1000).optional(),
});

export type UpdateMediaInput = z.infer<typeof UpdateMediaSchema>;

export function validateUpdateMedia(input: unknown): UpdateMediaInput {
  return validateWithSchema(UpdateMediaSchema, input, "Invalid media update payload");
}
