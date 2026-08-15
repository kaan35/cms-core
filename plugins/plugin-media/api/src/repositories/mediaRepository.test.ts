import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MediaRepository } from "./mediaRepository.js";

describe("MediaRepository", () => {
  it("creates, finds, lists, and deletes media records", async () => {
    const db = createInMemoryDb();
    const repo = new MediaRepository(db);

    const doc1 = await repo.create({
      key: "uuid1-test1.png",
      filename: "test1.png",
      mimeType: "image/png",
      size: 1024,
      url: "http://localhost:9000/cms-media/uuid1-test1.png",
      uploaderId: "user-1",
    });

    assert.ok(doc1.id);
    assert.equal(doc1.key, "uuid1-test1.png");

    const doc2 = await repo.create({
      key: "uuid2-test2.jpg",
      filename: "test2.jpg",
      mimeType: "image/jpeg",
      size: 2048,
      url: "http://localhost:9000/cms-media/uuid2-test2.jpg",
      uploaderId: "user-1",
    });

    const found = await repo.findById(doc1.id);
    assert.ok(found);
    assert.equal(found.filename, "test1.png");

    const foundByKey = await repo.findByKey("uuid2-test2.jpg");
    assert.ok(foundByKey);
    assert.equal(foundByKey.id, doc2.id);

    const list = await repo.list({ page: 1, limit: 10 });
    assert.equal(list.meta.total, 2);
    assert.equal(list.data.length, 2);

    await repo.deleteById(doc1.id);
    const afterDelete = await repo.findById(doc1.id);
    assert.equal(afterDelete, null);
  });
});
