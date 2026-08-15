import { ValidationError } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateCreatePage, validateUpdatePage } from "./page.rules.js";

describe("Page Domain Rules", () => {
  it("validates a complete valid page with multiple blocks", () => {
    const validPage = {
      title: "Home Page",
      slug: "home",
      status: "published",
      blocks: [
        {
          type: "hero",
          title: "Welcome to CMS",
          subtitle: "Fast and reliable",
          primaryCta: { label: "Get Started", url: "/docs" },
        },
        {
          type: "gallery",
          images: [{ mediaId: "media-uuid-1", caption: "Photo 1" }],
          layout: "grid",
        },
        {
          type: "text",
          content: "# Markdown Content",
        },
        {
          type: "form",
          formId: "contact-form-uuid",
        },
        {
          type: "blog_posts",
          limit: 3,
          category: "tech",
        },
      ],
    };

    const parsed = validateCreatePage(validPage);
    assert.equal(parsed.title, "Home Page");
    assert.equal(parsed.blocks.length, 5);
  });

  it("rejects pages with empty blocks array", () => {
    assert.throws(
      () =>
        validateCreatePage({
          title: "Empty Page",
          blocks: [],
        }),
      ValidationError,
    );
  });

  it("rejects unknown or invalid block types", () => {
    assert.throws(
      () =>
        validateCreatePage({
          title: "Bad Block Page",
          blocks: [{ type: "unknown_block", foo: "bar" }],
        }),
      ValidationError,
    );
  });

  it("validates partial update inputs", () => {
    const update = validateUpdatePage({
      title: "Updated Title",
      status: "draft",
    });
    assert.equal(update.title, "Updated Title");
    assert.equal(update.status, "draft");
  });
});
