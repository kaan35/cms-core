import { ValidationError } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateStorageKey,
  MAX_MEDIA_FILE_SIZE,
  sanitizeFilename,
  validateMediaFileSize,
  validateMediaMagicBytes,
  validateMediaMimeType,
} from "./media.rules.js";

describe("Media Domain Rules", () => {
  it("validateMediaMimeType accepts valid image types", () => {
    assert.equal(validateMediaMimeType("image/png"), "image/png");
    assert.equal(validateMediaMimeType("image/jpeg"), "image/jpeg");
    assert.equal(validateMediaMimeType("image/webp"), "image/webp");
    assert.equal(validateMediaMimeType(" IMAGE/JPEG "), "image/jpeg");
  });

  it("validateMediaMimeType strictly rejects SVG and executable/document types", () => {
    assert.throws(() => validateMediaMimeType("image/svg+xml"), ValidationError);
    assert.throws(() => validateMediaMimeType("image/svg"), ValidationError);
    assert.throws(() => validateMediaMimeType("text/html"), ValidationError);
    assert.throws(() => validateMediaMimeType("application/pdf"), ValidationError);
    assert.throws(() => validateMediaMimeType("application/javascript"), ValidationError);
  });

  it("validateMediaFileSize accepts valid sizes under 10MB", () => {
    assert.doesNotThrow(() => validateMediaFileSize(100));
    assert.doesNotThrow(() => validateMediaFileSize(MAX_MEDIA_FILE_SIZE));
  });

  it("validateMediaFileSize rejects zero, negative, and oversized files", () => {
    assert.throws(() => validateMediaFileSize(0), ValidationError);
    assert.throws(() => validateMediaFileSize(-1), ValidationError);
    assert.throws(() => validateMediaFileSize(MAX_MEDIA_FILE_SIZE + 1), ValidationError);
  });

  it("validateMediaMagicBytes accepts valid PNG, JPEG, and WebP binary headers and rejects spoofed MIME types", () => {
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const validWebp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
    ]);

    assert.doesNotThrow(() => validateMediaMagicBytes(validPng, "image/png"));
    assert.doesNotThrow(() => validateMediaMagicBytes(validJpeg, "image/jpeg"));
    assert.doesNotThrow(() => validateMediaMagicBytes(validWebp, "image/webp"));

    // Spoofed SVG/HTML payload claiming to be image/png
    const spoofedHtml = Buffer.from("<script>alert(1)</script>");
    assert.throws(() => validateMediaMagicBytes(spoofedHtml, "image/png"), ValidationError);
    // Cross-type mismatch (JPEG bytes declared as PNG)
    assert.throws(() => validateMediaMagicBytes(validJpeg, "image/png"), ValidationError);
  });

  it("sanitizeFilename strips directory traversal sequences and unsafe characters", () => {
    assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
    assert.equal(sanitizeFilename("..\\..\\windows\\system32\\cmd.exe"), "cmd.exe");
    assert.equal(sanitizeFilename("my photo (1).jpg"), "my-photo-1.jpg");
    assert.equal(sanitizeFilename("../../../hero.png"), "hero.png");
    assert.equal(sanitizeFilename(""), "upload.bin");
    assert.equal(sanitizeFilename("..."), "upload.bin");
  });

  it("generateStorageKey generates unique random-prefixed storage key", () => {
    const key1 = generateStorageKey("banner.png");
    const key2 = generateStorageKey("banner.png");
    assert.notEqual(key1, key2);
    assert.ok(key1.endsWith("-banner.png"));
    assert.ok(key2.endsWith("-banner.png"));
  });
});
