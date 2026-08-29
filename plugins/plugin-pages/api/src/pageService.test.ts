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
});
