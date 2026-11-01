import type { ICache } from "@cms/core";
import { HookManager, RedirectsService, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PageService } from "./pageService.js";
import { PagesRepository } from "./repositories/pagesRepository.js";

describe("PageService", () => {
  it("creates, updates, and deletes pages with hook events", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new PagesRepository(db, redirects);
    const hooks = new HookManager();

    const events: string[] = [];
    hooks.on("page.created", async () => {
      events.push("created");
    });
    hooks.on("page.updated", async () => {
      events.push("updated");
    });
    hooks.on("page.deleted", async () => {
      events.push("deleted");
    });

    const service = new PageService(repo, hooks, stubLogger);

    const page = await service.createPage({
      title: "Services",
      blocks: [{ type: "text", content: "Our services" }],
      status: "published",
    });

    assert.equal(page.slug, "services");
    assert.equal(events.includes("created"), true);

    await service.updatePage(page.id, { title: "Our Services" });
    assert.equal(events.includes("updated"), true);

    await service.deletePage(page.id);
    assert.equal(events.includes("deleted"), true);
  });

  it("hides drafts from unauthorized slug fetches", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new PagesRepository(db, redirects);
    const hooks = new HookManager();
    const service = new PageService(repo, hooks, stubLogger);

    await service.createPage({
      title: "Secret Draft",
      slug: "secret-draft",
      blocks: [{ type: "text", content: "Draft content" }],
      status: "draft",
    });

    const hidden = await service.getPageBySlug("secret-draft", false);
    assert.equal(hidden, null);

    const visibleToAdmin = await service.getPageBySlug("secret-draft", true);
    assert.ok(visibleToAdmin);
    assert.equal(visibleToAdmin.slug, "secret-draft");
  });

  it("enforces single home page invariant (auto-demotes previous home page)", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new PagesRepository(db, redirects);
    const hooks = new HookManager();
    const service = new PageService(repo, hooks, stubLogger);

    // 1. Create initial Home Page
    const home1 = await service.createPage({
      title: "Home Original",
      slug: "home",
      pageType: "home",
      blocks: [{ type: "text", content: "Welcome" }],
      status: "published",
    });

    assert.equal(home1.pageType, "home");
    const currentHome1 = await service.getHomePage(false);
    assert.equal(currentHome1?.id, home1.id);

    // 2. Create a second Home Page -> home1 must be demoted to standard
    const home2 = await service.createPage({
      title: "Home Redesign",
      slug: "home-new",
      pageType: "home",
      blocks: [{ type: "text", content: "Welcome 2.0" }],
      status: "published",
    });

    assert.equal(home2.pageType, "home");
    const updatedHome1 = await service.getPageById(home1.id);
    assert.equal(updatedHome1.pageType, "standard");

    const currentHome2 = await service.getHomePage(false);
    assert.equal(currentHome2?.id, home2.id);

    // 3. Update a third standard page to 'home' -> home2 must be demoted
    const page3 = await service.createPage({
      title: "Landing",
      slug: "landing",
      pageType: "standard",
      blocks: [{ type: "text", content: "Landing" }],
      status: "published",
    });

    await service.updatePage(page3.id, { pageType: "home" });

    const updatedHome2 = await service.getPageById(home2.id);
    assert.equal(updatedHome2.pageType, "standard");

    const currentHome3 = await service.getHomePage(false);
    assert.equal(currentHome3?.id, page3.id);
  });

  it("caches getPageBySlug and getHomePage and bypasses cache when canViewDraft is true", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new PagesRepository(db, redirects);
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

    const service = new PageService(repo, hooks, stubLogger, cache);

    // 1. Create page -> invalidates cache keys
    const page = await service.createPage({
      title: "About Us",
      slug: "about",
      blocks: [{ type: "text", content: "About content" }],
      status: "published",
    });

    assert.ok(deletedKeys.includes("cms:pages:slug:about"));
    assert.ok(deletedKeys.includes("cms:pages:home"));

    // 2. Query page with canViewDraft = false -> caches under cms:pages:slug:about
    const fetched1 = await service.getPageBySlug("about", false);
    assert.equal(fetched1?.id, page.id);
    assert.ok(store.has("cms:pages:slug:about"));

    // 3. Draft bypass: canViewDraft = true must not use or populate draft key
    await service.createPage({
      title: "Draft Secrets",
      slug: "draft-secrets",
      blocks: [{ type: "text", content: "Draft" }],
      status: "draft",
    });

    const draftPage = await service.getPageBySlug("draft-secrets", true);
    assert.equal(draftPage?.slug, "draft-secrets");
    assert.equal(store.has("cms:pages:slug:draft-secrets"), false);

    // 4. Update page and test invalidation including old and new slugs
    deletedKeys.length = 0;
    await service.updatePage(page.id, { slug: "about-us" });
    assert.ok(deletedKeys.includes("cms:pages:slug:about"));
    assert.ok(deletedKeys.includes("cms:pages:slug:about-us"));

    // 5. Delete page invalidates
    deletedKeys.length = 0;
    await service.deletePage(page.id);
    assert.ok(deletedKeys.includes("cms:pages:slug:about-us"));
  });

  it("never caches draft content in Redis and immediately invalidates cache when published page is reverted to draft", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new PagesRepository(db, redirects);
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

    const service = new PageService(repo, hooks, stubLogger, cache);

    // 1. Create a published page
    const page = await service.createPage({
      title: "Confidential Roadmap",
      slug: "confidential-roadmap",
      blocks: [{ type: "text", content: "Secret plans for 2027" }],
      status: "published",
    });

    const cacheKey = `cms:pages:slug:${page.slug}`;

    // 2. Public user fetches page -> populated into cache
    const publicResult = await service.getPageBySlug("confidential-roadmap", false);
    assert.ok(publicResult);
    assert.equal(publicResult.title, "Confidential Roadmap");
    assert.ok(store.has(cacheKey), "Published page should be cached in Redis");

    // 3. Editor updates the page to 'draft' status (unpublishing it)
    deletedKeys.length = 0;
    const unpublishUpdate = await service.updatePage(page.id, {
      status: "draft",
    });
    assert.equal(unpublishUpdate.status, "draft");

    // Verify cache was deterministically invalidated
    assert.ok(
      deletedKeys.includes(cacheKey),
      `Expected ${cacheKey} to be in deletedKeys list upon unpublishing`,
    );
    assert.equal(
      store.has(cacheKey),
      false,
      "Cache must not hold the un-published page after status update",
    );

    // 4. Public user attempts to fetch -> must return null (fail closed)
    const publicFetchAfterDraft = await service.getPageBySlug("confidential-roadmap", false);
    assert.equal(
      publicFetchAfterDraft,
      null,
      "Public fetch must return null for reverted draft page",
    );
    assert.equal(
      store.has(cacheKey),
      false,
      "Draft page must NEVER be cached or leak into public Redis store",
    );

    // 5. Editor previews the draft with canViewDraft = true
    const editorPreview = await service.getPageBySlug("confidential-roadmap", true);
    assert.ok(editorPreview, "Editor must be able to view draft content");
    assert.equal(editorPreview.status, "draft");
    assert.equal(
      store.has(cacheKey),
      false,
      "Editor draft preview MUST bypass cache and NEVER write draft to Redis",
    );
  });
});
