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

    // 9. List blog posts with ?search= and ?status= filtering
    // Anonymous user list -> only published posts
    const anonListRes = await app.inject({
      method: "GET",
      url: "/blog",
    });
    assert.equal(anonListRes.statusCode, 200);
    const anonListJson = anonListRes.json() as { data: Array<{ status: string }> };
    assert.equal(anonListJson.data.length, 1);
    assert.equal(anonListJson.data[0]?.status, "published");

    // List with ?search= query matching title
    const searchFilterRes = await app.inject({
      method: "GET",
      url: "/blog?search=Launch",
    });
    assert.equal(searchFilterRes.statusCode, 200);
    const searchFilterJson = searchFilterRes.json() as { data: Array<{ title: string }> };
    assert.equal(searchFilterJson.data.length, 1);
    assert.ok(searchFilterJson.data[0]?.title.includes("Launch"));

    // List with ?search= query matching summary
    const summaryFilterRes = await app.inject({
      method: "GET",
      url: "/blog?search=details",
    });
    assert.equal(summaryFilterRes.statusCode, 200);
    const summaryFilterJson = summaryFilterRes.json() as { data: Array<{ summary: string }> };
    assert.equal(summaryFilterJson.data.length, 1);

    // List with ?search= that yields no matches
    const noMatchRes = await app.inject({
      method: "GET",
      url: "/blog?search=nonexistentterm123",
    });
    assert.equal(noMatchRes.statusCode, 200);
    const noMatchJson = noMatchRes.json() as { data: unknown[] };
    assert.equal(noMatchJson.data.length, 0);

    // Anonymous user attempts ?status=draft -> fail-closed: must only return published posts
    const anonDraftAttempt = await app.inject({
      method: "GET",
      url: "/blog?status=draft",
    });
    assert.equal(anonDraftAttempt.statusCode, 200);
    const anonDraftJson = anonDraftAttempt.json() as { data: Array<{ status: string }> };
    assert.ok(anonDraftJson.data.every((p) => p.status === "published"));

    // Authenticated user with draft access lists with ?status=draft
    const authDraftRes = await app.inject({
      method: "GET",
      url: "/blog?status=draft",
      headers: {
        "x-test-user": "author-1",
        "x-test-perms": "blog:read:draft",
      },
    });
    assert.equal(authDraftRes.statusCode, 200);
    const authDraftJson = authDraftRes.json() as { data: Array<{ status: string }> };
    assert.equal(authDraftJson.data.length, 1);
    assert.equal(authDraftJson.data[0]?.status, "draft");

    // Authenticated user lists with ?status=published
    const authPubRes = await app.inject({
      method: "GET",
      url: "/blog?status=published",
      headers: {
        "x-test-user": "author-1",
        "x-test-perms": "blog:read:draft",
      },
    });
    assert.equal(authPubRes.statusCode, 200);
    const authPubJson = authPubRes.json() as { data: Array<{ status: string }> };
    assert.equal(authPubJson.data.length, 1);
    assert.equal(authPubJson.data[0]?.status, "published");
  });

  it("rejects unauthorized access to draft blog posts via ID fallback", async () => {
    const { app } = await buildTestApp();

    // 1. Create a draft post
    const createRes = await app.inject({
      method: "POST",
      url: "/blog",
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "blog:write",
      },
      payload: {
        title: "Secret Draft Post",
        slug: "secret-draft",
        summary: "Draft summary",
        content: "Draft content that must not leak",
        status: "draft",
      },
    });
    assert.equal(createRes.statusCode, 201);
    const draft = createRes.json() as { id: string };

    // 2. Anonymous visitor tries to fetch draft by slug -> 404
    const anonSlugRes = await app.inject({
      method: "GET",
      url: "/blog/secret-draft",
    });
    assert.equal(anonSlugRes.statusCode, 404);

    // 3. Anonymous visitor tries ID fallback -> MUST return 404
    const anonIdRes = await app.inject({
      method: "GET",
      url: `/blog/${draft.id}`,
    });
    assert.equal(anonIdRes.statusCode, 404);

    // 4. Authorized user with blog:read:draft can access by ID
    const authIdRes = await app.inject({
      method: "GET",
      url: `/blog/${draft.id}`,
      headers: {
        "x-test-user": "editor-1",
        "x-test-perms": "blog:read:draft",
      },
    });
    assert.equal(authIdRes.statusCode, 200);
    assert.equal((authIdRes.json() as { id: string }).id, draft.id);
  });
});
