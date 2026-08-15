import { HookManager, NotFoundError, ValidationError, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MediaService } from "./mediaService.js";
import { MediaRepository } from "./repositories/mediaRepository.js";
import type { IStorageAdapter, StorageUploadResult } from "./storageAdapter.js";

class MockStorageAdapter implements IStorageAdapter {
  public uploadedFiles = new Map<string, Buffer | Uint8Array>();
  public deletedKeys: string[] = [];

  async upload(
    key: string,
    body: Buffer | Uint8Array,
    _mimeType: string,
  ): Promise<StorageUploadResult> {
    this.uploadedFiles.set(key, body);
    return {
      key,
      url: `http://localhost:9000/cms-media/${key}`,
      size: body.length,
    };
  }

  async delete(key: string): Promise<void> {
    this.deletedKeys.push(key);
    this.uploadedFiles.delete(key);
  }

  getUrl(key: string): string {
    return `http://localhost:9000/cms-media/${key}`;
  }
}

describe("MediaService", () => {
  it("uploads valid image and emits media.uploaded hook", async () => {
    const db = createInMemoryDb();
    const mediaRepo = new MediaRepository(db);
    const storageAdapter = new MockStorageAdapter();
    const hooks = new HookManager();

    const emittedEvents: Array<{ event: string; payload: unknown }> = [];
    hooks.on("media.uploaded", async (data) => {
      emittedEvents.push({ event: "media.uploaded", payload: data });
    });

    const service = new MediaService(mediaRepo, storageAdapter, hooks, stubLogger);

    const buffer = Buffer.from("png-image-content");
    const mediaDoc = await service.uploadFile({
      filename: "avatar.png",
      buffer,
      mimeType: "image/png",
      uploaderId: "user-123",
    });

    assert.ok(mediaDoc.id);
    assert.equal(mediaDoc.filename, "avatar.png");
    assert.equal(mediaDoc.mimeType, "image/png");
    assert.equal(mediaDoc.size, buffer.length);
    assert.ok(storageAdapter.uploadedFiles.has(mediaDoc.key));
    assert.equal(emittedEvents.length, 1);
  });

  it("rejects SVG and invalid formats", async () => {
    const db = createInMemoryDb();
    const mediaRepo = new MediaRepository(db);
    const storageAdapter = new MockStorageAdapter();
    const hooks = new HookManager();
    const service = new MediaService(mediaRepo, storageAdapter, hooks, stubLogger);

    await assert.rejects(
      () =>
        service.uploadFile({
          filename: "icon.svg",
          buffer: Buffer.from("<svg></svg>"),
          mimeType: "image/svg+xml",
          uploaderId: "user-1",
        }),
      ValidationError,
    );
  });

  it("deletes file from storage first, then from DB", async () => {
    const db = createInMemoryDb();
    const mediaRepo = new MediaRepository(db);
    const storageAdapter = new MockStorageAdapter();
    const hooks = new HookManager();

    const emittedEvents: Array<{ event: string; payload: unknown }> = [];
    hooks.on("media.deleted", async (data) => {
      emittedEvents.push({ event: "media.deleted", payload: data });
    });

    const service = new MediaService(mediaRepo, storageAdapter, hooks, stubLogger);

    const doc = await service.uploadFile({
      filename: "photo.webp",
      buffer: Buffer.from("webp-data"),
      mimeType: "image/webp",
      uploaderId: "admin-1",
    });

    await service.deleteMedia(doc.id, "admin-1");

    assert.ok(storageAdapter.deletedKeys.includes(doc.key));
    const findAfterDelete = await mediaRepo.findById(doc.id);
    assert.equal(findAfterDelete, null);
    assert.equal(emittedEvents.length, 1);
  });

  it("throws NotFoundError when deleting non-existent media", async () => {
    const db = createInMemoryDb();
    const mediaRepo = new MediaRepository(db);
    const storageAdapter = new MockStorageAdapter();
    const hooks = new HookManager();
    const service = new MediaService(mediaRepo, storageAdapter, hooks, stubLogger);

    await assert.rejects(() => service.deleteMedia("non-existent-id"), NotFoundError);
  });
});
