import { decorateTestAuth, HookManager, RedirectsService, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import fastify from "fastify";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PageController } from "./pageController.js";
import { PageService } from "./pageService.js";
import { PagesRepository } from "./repositories/pagesRepository.js";
import { registerPageRoutes } from "./routes.js";

async function buildTestApp() {
  const app = fastify();
  const db = createInMemoryDb();
  const redirects = new RedirectsService(db, stubLogger);
  const repo = new PagesRepository(db, redirects);
  const hooks = new HookManager();
  const service = new PageService(repo, hooks, stubLogger);
  const controller = new PageController(service, redirects);

  decorateTestAuth(app);

  registerPageRoutes(app, controller);
  await app.ready();
  return { app, repo, redirects };
}

describe("Page Routes & Workflows", () => {
  it("CRUD pages, draft/published permissions, and search", async () => {
    const { app } = await buildTestApp();

    // 1. Create a published page with auth
    const createRes = await app.inject({
      method: "POST",
      url: "/pages",
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "pages:write",
      },
      payload: {
        title: "Landing Page",
        slug: "landing",
        status: "published",
        blocks: [
          {
            type: "hero",
            title: "Next-gen Platform",
          },
        ],
      },
    });

    assert.equal(createRes.statusCode, 201);
    const createdPage = createRes.json() as { id: string; slug: string };
    assert.equal(createdPage.slug, "landing");

    // 2. Fetch public page by slug (anonymous)
    const publicGet = await app.inject({
      method: "GET",
      url: "/pages/landing",
    });
    assert.equal(publicGet.statusCode, 200);

    // 3. Create a draft page
    const draftRes = await app.inject({
      method: "POST",
      url: "/pages",
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "pages:write",
      },
      payload: {
        title: "Draft Page",
        slug: "draft-page",
        status: "draft",
        blocks: [{ type: "text", content: "Draft content" }],
      },
    });
    assert.equal(draftRes.statusCode, 201);

    // 4. Anonymous fetch of draft returns 404
    const draftAnonGet = await app.inject({
      method: "GET",
      url: "/pages/draft-page",
    });
    assert.equal(draftAnonGet.statusCode, 404);

    // 5. Update page slug -> automatically sets up 301 redirect
    const updateRes = await app.inject({
      method: "PUT",
      url: `/pages/${createdPage.id}`,
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "pages:write",
      },
      payload: {
        slug: "new-landing",
      },
    });
    assert.equal(updateRes.statusCode, 200);

    // 6. Old slug request returns 301 Permanent Redirect
    const redirectCheck = await app.inject({
      method: "GET",
      url: "/pages/landing",
    });
    assert.equal(redirectCheck.statusCode, 301);
    assert.equal(redirectCheck.headers["location"], "/pages/new-landing");

    // 7. Version history list
    const versionsRes = await app.inject({
      method: "GET",
      url: `/pages/${createdPage.id}/versions`,
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "pages:write",
      },
    });
    assert.equal(versionsRes.statusCode, 200);
    assert.equal((versionsRes.json() as unknown[]).length, 2);

    // 8. Search published pages
    const searchRes = await app.inject({
      method: "GET",
      url: "/pages/search?q=Landing",
    });
    assert.equal(searchRes.statusCode, 200);
    const searchJson = searchRes.json() as { data: unknown[] };
    assert.equal(searchJson.data.length, 1);
  });
});
