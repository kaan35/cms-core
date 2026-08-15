import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FormsRepository } from "./formsRepository.js";

describe("FormsRepository", () => {
  it("creates, retrieves, updates, and deletes forms", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);

    const form = await repo.create({
      title: "Contact Us",
      fields: [{ name: "email", label: "Email", type: "email", required: true }],
      captchaProvider: "challenge",
      challengeType: "alphanumeric",
      submitButtonText: "Submit",
      successMessage: "Thank you!",
    });

    assert.ok(form.id);
    assert.equal(form.slug, "contact-us");

    const found = await repo.findById(form.id);
    assert.ok(found);
    assert.equal(found.title, "Contact Us");

    const updated = await repo.update(form.id, {
      title: "Contact Us Updated",
      submitButtonText: "Send Message",
    });
    assert.equal(updated.title, "Contact Us Updated");
    assert.equal(updated.submitButtonText, "Send Message");
    assert.equal(updated.slug, "contact-us-updated");

    await repo.delete(form.id);
    const deleted = await repo.findById(form.id);
    assert.equal(deleted, null);
  });

  it("creates and paginates form submissions", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);

    const form = await repo.create({
      title: "Inquiries",
      fields: [{ name: "name", label: "Name", type: "text", required: true }],
      captchaProvider: "none",
      challengeType: "alphanumeric",
      submitButtonText: "Submit",
      successMessage: "Thank you!",
    });

    for (let i = 1; i <= 5; i++) {
      await repo.createSubmission(form.id, { name: `User ${i}` });
    }

    const page1 = await repo.listSubmissions(form.id, 1, 3);
    assert.equal(page1.data.length, 3);
    assert.equal(page1.meta.total, 5);
    assert.equal(page1.meta.totalPages, 2);

    const page2 = await repo.listSubmissions(form.id, 2, 3);
    assert.equal(page2.data.length, 2);
  });
});
