import { decorateTestAuth, HookManager, RedirectsService, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import fastify from "fastify";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BlogPostController } from "./blogPostController.js";
import { BlogPostService } from "./blogPostService.js";
import { BlogPostsRepository } from "./repositories/blogPostsRepository.js";
import { registerBlogRoutes } from "./routes.js";

async function buildTestApp() {
  const app = fastify();
  const db = createInMemoryDb();
  const redirects = new RedirectsService(db, stubLogger);
  const repo = new BlogPostsRepository(db, redirects);
  const hooks = new HookManager();
  const service = new BlogPostService(repo, hooks, stubLogger);
  const controller = new BlogPostController(service, redirects);

  decorateTestAuth(app);
  registerBlogRoutes(app, controller);
  await app.ready();
  return { app, repo, redirects };
}

describe("Blog Routes & Workflows", () => {
  it("CRUD blog posts, draft/published visibility, 301 redirects, and search", async () => {
    const { app } = await buildTestApp();

    // 1. Create a published post with auth
    const createRes = await app.inject({
      method: "POST",
      url: "/blog",
      headers: {
        "x-test-user": "author-1",
        "x-test-perms": "blog:write",
      },
      payload: {
        title: "Announcing Product Launch",
        slug: "announcing-launch",
        summary: "Product launch details",
        content: "Today we are happy to introduce our product...",
        coverMediaId: "media-cover-1",
        status: "published",
      },
    });

    assert.equal(createRes.statusCode, 201);
    const createdPost = createRes.json() as { id: string; slug: string };
    assert.equal(createdPost.slug, "announcing-launch");

    // 2. Fetch public post by slug (anonymous)
    const publicGet = await app.inject({
      method: "GET",
      url: "/blog/announcing-launch",
    });
    assert.equal(publicGet.statusCode, 200);

    // 3. Create a draft post
    const draftRes = await app.inject({
      method: "POST",
      url: "/blog",
      headers: {
        "x-test-user": "author-1",
        "x-test-perms": "blog:write",
      },
      payload: {
        title: "Draft Article",
        slug: "draft-article",
        summary: "Upcoming post summary",
        content: "Secret unreleased post...",
        status: "draft",
      },
    });
    assert.equal(draftRes.statusCode, 201);

    // 4. Anonymous fetch of draft returns 404
    const draftAnonGet = await app.inject({
      method: "GET",
      url: "/blog/draft-article",
    });
    assert.equal(draftAnonGet.statusCode, 404);

    // 5. Update post slug -> automatically sets up 301 redirect
    const updateRes = await app.inject({
      method: "PUT",
      url: `/blog/${createdPost.id}`,
      headers: {
        "x-test-user": "author-1",
        "x-test-perms": "blog:write",
      },
      payload: {
        slug: "new-launch-announcement",
      },
    });
    assert.equal(updateRes.statusCode, 200);

    // 6. Old slug request returns 301 Permanent Redirect
    const redirectCheck = await app.inject({
      method: "GET",
      url: "/blog/announcing-launch",
    });
    assert.equal(redirectCheck.statusCode, 301);
    assert.equal(redirectCheck.headers["location"], "/blog/new-launch-announcement");

    // 7. Version history list
    const versionsRes = await app.inject({
      method: "GET",
      url: `/blog/${createdPost.id}/versions`,
      headers: {
        "x-test-user": "author-1",
        "x-test-perms": "blog:write",
      },
    });
    assert.equal(versionsRes.statusCode, 200);
    assert.equal((versionsRes.json() as unknown[]).length, 2);

    // 8. Search published posts
    const searchRes = await app.inject({
      method: "GET",
      url: "/blog/search?q=Product",
    });
    assert.equal(searchRes.statusCode, 200);
    const searchJson = searchRes.json() as { data: unknown[] };
    assert.equal(searchJson.data.length, 1);
  });
});
