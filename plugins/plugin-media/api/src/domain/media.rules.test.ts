import { ValidationError } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateStorageKey,
  MAX_MEDIA_FILE_SIZE,
  sanitizeFilename,
  validateMediaFileSize,
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
