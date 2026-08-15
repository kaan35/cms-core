import { ValidationError } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateCreateBlogPost, validateUpdateBlogPost } from "./blogPost.rules.js";

describe("blogPost.rules", () => {
  it("validates valid create blog post payload and defaults status to draft", () => {
    const validated = validateCreateBlogPost({
      title: "My First Post",
      summary: "This is a brief summary",
      content: "Full markdown content goes here...",
      coverMediaId: "media-uuid-1",
    });

    assert.equal(validated.title, "My First Post");
    assert.equal(validated.summary, "This is a brief summary");
    assert.equal(validated.status, "draft");
    assert.equal(validated.coverMediaId, "media-uuid-1");
  });

  it("throws ValidationError when required fields are missing", () => {
    assert.throws(() => validateCreateBlogPost({ title: "" }), ValidationError);

    assert.throws(() => validateCreateBlogPost({ title: "Valid", summary: "" }), ValidationError);

    assert.throws(
      () => validateCreateBlogPost({ title: "Valid", summary: "Summary", content: "" }),
      ValidationError,
    );
  });

  it("validates partial update without resetting status to draft", () => {
    const update = validateUpdateBlogPost({
      title: "Updated Title",
    });

    assert.equal(update.title, "Updated Title");
    assert.equal(update.status, undefined);
  });
});
