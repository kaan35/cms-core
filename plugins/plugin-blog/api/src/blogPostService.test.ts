import type { ICache } from "@cms/core";
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

  it("caches getBlogPostBySlug and bypasses cache when canViewDraft is true", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new BlogPostsRepository(db, redirects);
    const hooks = new HookManager();

    const store = new Map<string, unknown>();
    const deletedKeys: string[] = [];
    const cache: ICache = {
      get: async (key: string) => (store.has(key) ? String(store.get(key)) : null),
      set: async (key: string, value: string) => {
        store.set(key, value);
      },
      del: async (...keys: string[]) => {
        deletedKeys.push(...keys);
        for (const k of keys) store.delete(k);
      },
      isAlive: async () => true,
      quit: async () => {},
      getJson: async <T>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
      setJson: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      getOrSet: async <T>(key: string, factory: () => Promise<T>) => {
        if (store.has(key)) return store.get(key) as T;
        const fresh = await factory();
        if (fresh !== undefined) store.set(key, fresh);
        return fresh;
      },
    };

    const service = new BlogPostService(repo, hooks, stubLogger, cache);

    // 1. Create post -> invalidates cache
    const post = await service.createBlogPost({
      title: "Initial Post",
      slug: "initial-post",
      summary: "Summary",
      content: "Content...",
      status: "published",
    });

    assert.ok(deletedKeys.includes("cms:blog:slug:initial-post"));

    // 2. Query with canViewDraft = false -> caches under cms:blog:slug:initial-post
    const fetched1 = await service.getBlogPostBySlug("initial-post", false);
    assert.equal(fetched1?.id, post.id);
    assert.ok(store.has("cms:blog:slug:initial-post"));

    // 3. Draft bypass: canViewDraft = true must not cache draft
    await service.createBlogPost({
      title: "Draft Post",
      slug: "draft-post",
      summary: "Draft summary",
      content: "Draft content...",
      status: "draft",
    });

    const draftPost = await service.getBlogPostBySlug("draft-post", true);
    assert.equal(draftPost?.slug, "draft-post");
    assert.equal(store.has("cms:blog:slug:draft-post"), false);

    // 4. Update post with new slug invalidates both old and new slugs
    deletedKeys.length = 0;
    await service.updateBlogPost(post.id, { slug: "updated-post" });
    assert.ok(deletedKeys.includes("cms:blog:slug:initial-post"));
    assert.ok(deletedKeys.includes("cms:blog:slug:updated-post"));

    // 5. Delete post invalidates
    deletedKeys.length = 0;
    await service.deleteBlogPost(post.id);
    assert.ok(deletedKeys.includes("cms:blog:slug:updated-post"));
  });

  it("never caches draft blog posts in Redis and deterministically invalidates cache when reverting published post to draft", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new BlogPostsRepository(db, redirects);
    const hooks = new HookManager();

    const store = new Map<string, unknown>();
    const deletedKeys: string[] = [];
    const cache: ICache = {
      get: async (key: string) => (store.has(key) ? String(store.get(key)) : null),
      set: async (key: string, value: string) => {
        store.set(key, value);
      },
      del: async (...keys: string[]) => {
        deletedKeys.push(...keys);
        for (const k of keys) store.delete(k);
      },
      isAlive: async () => true,
      quit: async () => {},
      getJson: async <T>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
      setJson: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      getOrSet: async <T>(key: string, factory: () => Promise<T>) => {
        if (store.has(key)) return store.get(key) as T;
        const fresh = await factory();
        if (fresh !== undefined && fresh !== null) store.set(key, fresh);
        return fresh;
      },
    };

    const service = new BlogPostService(repo, hooks, stubLogger, cache);

    // 1. Create a published blog post
    const post = await service.createBlogPost({
      title: "Quarterly Earnings Leak",
      slug: "quarterly-earnings-leak",
      summary: "Financial results summary",
      content: "Revenue grew 40% YoY...",
      status: "published",
    });

    const cacheKey = `cms:blog:slug:${post.slug}`;

    // 2. Public visitor reads post -> should be cached
    const publicPost = await service.getBlogPostBySlug("quarterly-earnings-leak", false);
    assert.ok(publicPost);
    assert.equal(publicPost.title, "Quarterly Earnings Leak");
    assert.ok(store.has(cacheKey), "Published blog post must be cached in Redis");

    // 3. Admin reverts post to draft status
    deletedKeys.length = 0;
    const reverted = await service.updateBlogPost(post.id, {
      status: "draft",
    });
    assert.equal(reverted.status, "draft");

    // Verify cache eviction
    assert.ok(
      deletedKeys.includes(cacheKey),
      `Expected ${cacheKey} to be invalidated in Redis on unpublish`,
    );
    assert.equal(
      store.has(cacheKey),
      false,
      "Redis cache must not retain the blog post after it is reverted to draft",
    );

    // 4. Public visitor requests post again -> fails closed (null) and does NOT cache draft
    const publicFetchAfterDraft = await service.getBlogPostBySlug("quarterly-earnings-leak", false);
    assert.equal(
      publicFetchAfterDraft,
      null,
      "Public fetch for reverted draft post must return null",
    );
    assert.equal(
      store.has(cacheKey),
      false,
      "Draft post must NEVER be cached in Redis on public request",
    );

    // 5. Editor previews the post with canViewDraft = true
    const editorPost = await service.getBlogPostBySlug("quarterly-earnings-leak", true);
    assert.ok(editorPost);
    assert.equal(editorPost.status, "draft");
    assert.equal(
      store.has(cacheKey),
      false,
      "Editor preview must bypass Redis and NEVER write draft data into cache",
    );
  });
});
