import { HookManager, RedirectsService, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BlogPostService } from "./blogPostService.js";
import { BlogPostsRepository } from "./repositories/blogPostsRepository.js";

describe("BlogPostService", () => {
  it("creates, updates, and deletes blog posts with hook events", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new BlogPostsRepository(db, redirects);
    const hooks = new HookManager();

    const events: string[] = [];
    hooks.on("blog.created", async () => {
      events.push("created");
    });
    hooks.on("blog.updated", async () => {
      events.push("updated");
    });
    hooks.on("blog.deleted", async () => {
      events.push("deleted");
    });

    const service = new BlogPostService(repo, hooks, stubLogger);

    const post = await service.createBlogPost({
      title: "New Feature Released",
      summary: "Explore the new feature",
      content: "Here is all the info...",
      status: "published",
    });

    assert.equal(post.slug, "new-feature-released");
    assert.equal(events.includes("created"), true);

    await service.updateBlogPost(post.id, { title: "New Features Released" });
    assert.equal(events.includes("updated"), true);

    await service.deleteBlogPost(post.id);
    assert.equal(events.includes("deleted"), true);
  });

  it("hides drafts from unauthorized slug fetches", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new BlogPostsRepository(db, redirects);
    const hooks = new HookManager();
    const service = new BlogPostService(repo, hooks, stubLogger);

    await service.createBlogPost({
      title: "Secret Post",
      slug: "secret-post",
      summary: "Draft summary",
      content: "Draft content...",
      status: "draft",
    });

    const hidden = await service.getBlogPostBySlug("secret-post", false);
    assert.equal(hidden, null);

    const visibleToAdmin = await service.getBlogPostBySlug("secret-post", true);
    assert.ok(visibleToAdmin);
    assert.equal(visibleToAdmin.slug, "secret-post");
  });
});
