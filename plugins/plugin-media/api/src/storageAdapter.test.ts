import type { S3Client } from "@aws-sdk/client-s3";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { S3StorageAdapter } from "./storageAdapter.js";

describe("S3StorageAdapter", () => {
  it("generates correct public URLs based on config", () => {
    const minioAdapter = new S3StorageAdapter({
      bucket: "cms-media",
      endpoint: "http://localhost:9000",
      forcePathStyle: true,
    });
    assert.equal(
      minioAdapter.getUrl("test-image.png"),
      "http://localhost:9000/cms-media/test-image.png",
    );

    const cdnAdapter = new S3StorageAdapter({
      bucket: "cms-media",
      endpoint: "http://minio:9000",
      publicUrl: "https://cdn.example.com",
    });
    assert.equal(cdnAdapter.getUrl("test-image.png"), "https://cdn.example.com/test-image.png");
  });

  it("uploads and deletes objects via S3Client", async () => {
    const sentCommands: unknown[] = [];
    const mockS3Client = {
      send: async (command: unknown) => {
        sentCommands.push(command);
        return {};
      },
    } as unknown as S3Client;

    const adapter = new S3StorageAdapter(
      {
        bucket: "cms-media",
        endpoint: "http://localhost:9000",
      },
      mockS3Client,
    );

    const buffer = Buffer.from("image-binary-data");
    const result = await adapter.upload("uuid-photo.png", buffer, "image/png");

    assert.equal(result.key, "uuid-photo.png");
    assert.equal(result.size, buffer.length);
    assert.equal(result.url, "http://localhost:9000/cms-media/uuid-photo.png");
    assert.equal(sentCommands.length, 2); // HeadBucketCommand + PutObjectCommand

    await adapter.delete("uuid-photo.png");
    assert.equal(sentCommands.length, 3); // + DeleteObjectCommand
  });
});
