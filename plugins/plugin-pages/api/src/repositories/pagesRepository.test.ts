import { RedirectsService, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PagesRepository } from "./pagesRepository.js";

describe("PagesRepository", () => {
  it("creates a page, tracks version 1 snapshot, and retrieves by slug", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new PagesRepository(db, redirects);

    const page = await repo.create({
      title: "About Us",
      blocks: [{ type: "text", content: "Hello world" }],
    });

    assert.ok(page.id);
    assert.equal(page.slug, "about-us");
    assert.equal(page.version, 1);

    const found = await repo.findBySlug("about-us");
    assert.ok(found);
    assert.equal(found.title, "About Us");

    const versions = await repo.listVersions(page.id);
    assert.equal(versions.length, 1);
    assert.equal(versions[0]?.version, 1);
  });

  it("updates page, records redirect on slug change, and saves version 2 snapshot", async () => {
    const db = createInMemoryDb();
    const redirects = new RedirectsService(db, stubLogger);
    const repo = new PagesRepository(db, redirects);

    const page = await repo.create({
      title: "Company",
      slug: "company-info",
      blocks: [{ type: "text", content: "Initial" }],
    });

    const updated = await repo.update(page.id, {
      title: "About Company",
      slug: "about-company",
      status: "published",
    });

    assert.equal(updated.version, 2);
    assert.equal(updated.slug, "about-company");

    // Verify 301 redirect was recorded from old slug to new slug
    const resolved = await redirects.findByFrom("company-info");
    assert.ok(resolved);
    assert.equal(resolved.to, "about-company");

    const versions = await repo.listVersions(page.id);
    assert.equal(versions.length, 2);
  });
});
