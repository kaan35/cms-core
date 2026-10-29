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

  it("bulk deletes all form submissions when deleting form", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);

    const form = await repo.create({
      title: "Bulk Delete Test Form",
      fields: [{ name: "email", label: "Email", type: "email", required: true }],
      captchaProvider: "none",
      challengeType: "alphanumeric",
      submitButtonText: "Submit",
      successMessage: "Thank you!",
    });

    for (let i = 0; i < 5; i++) {
      await repo.createSubmission(form.id, { email: `test${i}@example.com` });
    }

    const countBefore = await repo.countSubmissions(form.id);
    assert.equal(countBefore, 5);

    // Execute bulk delete on form
    await repo.delete(form.id);

    // Form and all submissions must be deleted
    assert.equal(await repo.findById(form.id), null);
    assert.equal(await repo.countSubmissions(form.id), 0);
  });

  it("searches submissions by matching dynamic fields inside data (WYSIWYG search parity)", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);

    const form = await repo.create({
      title: "Applicant Form",
      fields: [
        { name: "name", label: "Full Name", type: "text", required: true },
        { name: "email", label: "Email Address", type: "email", required: true },
      ],
      captchaProvider: "none",
      challengeType: "alphanumeric",
      submitButtonText: "Submit",
      successMessage: "Done",
    });

    await repo.createSubmission(form.id, { name: "Jane Doe", email: "jane@test.org" });
    await repo.createSubmission(form.id, { name: "John Smith", email: "john@test.org" });

    // Search by name inside data
    const resName = await repo.listSubmissions(form.id, 1, 10, "Jane");
    assert.equal(resName.meta.total, 1);
    assert.equal(resName.data[0]?.data["name"], "Jane Doe");

    // Search by email inside data
    const resEmail = await repo.listSubmissions(form.id, 1, 10, "john@test.org");
    assert.equal(resEmail.meta.total, 1);
    assert.equal(resEmail.data[0]?.data["name"], "John Smith");
  });
});
