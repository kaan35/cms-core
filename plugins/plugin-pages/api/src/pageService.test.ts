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
});
