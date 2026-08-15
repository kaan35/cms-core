import { RedirectsService, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BlogPostsRepository } from "./blogPostsRepository.js";

describe("BlogPostsRepository", () => {
  it("creates a blog post, tracks version 1 snapshot, and retrieves by slug", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new BlogPostsRepository(db, redirects);

    const post = await repo.create({
      title: "Announcing v1.0",
      summary: "First major release",
      content: "We are thrilled to launch v1.0...",
      status: "published",
    });

    assert.ok(post.id);
    assert.equal(post.slug, "announcing-v10");
    assert.equal(post.version, 1);

    const found = await repo.findBySlug("announcing-v10");
    assert.ok(found);
    assert.equal(found.title, "Announcing v1.0");

    const versions = await repo.listVersions(post.id);
    assert.equal(versions.length, 1);
    assert.equal(versions[0]?.version, 1);
  });

  it("updates post, records redirect on slug change, and saves version 2 snapshot", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new BlogPostsRepository(db, redirects);

    const post = await repo.create({
      title: "Initial Post",
      slug: "initial-post",
      summary: "Short summary",
      content: "Content...",
      status: "published",
    });

    const updated = await repo.update(post.id, {
      title: "Updated Post Title",
      slug: "updated-post-title",
      status: "published",
    });

    assert.equal(updated.version, 2);
    assert.equal(updated.slug, "updated-post-title");

    // Verify 301 redirect was recorded from old slug to new slug
    const resolved = await redirects.findByFrom("initial-post");
    assert.ok(resolved);
    assert.equal(resolved.to, "updated-post-title");

    const versions = await repo.listVersions(post.id);
    assert.equal(versions.length, 2);
  });
});
