import { HookManager, ValidationError, stubLogger, type ICache } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateChallenge } from "./captcha/challengeProvider.js";
import { CaptchaRegistry } from "./captcha/registry.js";
import { FORMS_EVENTS } from "./domain/form.rules.js";
import { FormsService } from "./formsService.js";
import { FormsRepository } from "./repositories/formsRepository.js";

const TEST_CAPTCHA_SECRET = "test-captcha-secret-key-32-chars-minimum";

function createMockCache(): ICache {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => {
      store.set(key, value);
    },
    del: async (...keys: string[]) => {
      for (const k of keys) store.delete(k);
    },
    isAlive: async () => true,
    quit: async () => {},
    getJson: async <T>(key: string) => {
      const v = store.get(key);
      return v ? (JSON.parse(v) as T) : null;
    },
    setJson: async (key: string, value: unknown) => {
      store.set(key, JSON.stringify(value));
    },
    getOrSet: async <T>(key: string, factory: () => Promise<T>) => {
      const v = store.get(key);
      if (v) return JSON.parse(v) as T;
      const res = await factory();
      store.set(key, JSON.stringify(res));
      return res;
    },
  };
}

describe("FormsService", () => {
  it("submits form successfully with valid challenge captcha and emits form.submitted", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);
    const registry = new CaptchaRegistry(TEST_CAPTCHA_SECRET);
    const hooks = new HookManager();
    const service = new FormsService(repo, registry, hooks, stubLogger);

    let emittedEvent: {
      formId: string;
      submissionId: string;
      data: Record<string, unknown>;
    } | null = null;
    hooks.on(FORMS_EVENTS.SUBMITTED, async (payload) => {
      emittedEvent = payload as {
        formId: string;
        submissionId: string;
        data: Record<string, unknown>;
      };
    });

    const form = await service.createForm({
      title: "Contact",
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
      ],
      captchaProvider: "challenge",
      challengeType: "alphanumeric",
      successMessage: "We received your message!",
    });

    // Request captcha
    const captchaRes = await service.generateCaptcha(form.id);
    assert.equal(captchaRes.captchaRequired, true);

    if (captchaRes.captchaRequired) {
      const code = captchaRes.question.replace("Enter code: ", "");

      const submitRes = await service.submitForm(form.id, {
        name: "Jane Doe",
        email: "jane@example.com",
        captchaToken: captchaRes.captchaToken,
        captchaAnswer: code,
      });

      assert.equal(submitRes.success, true);
      assert.equal(submitRes.message, "We received your message!");
      assert.ok(submitRes.submissionId);

      // Verify event was emitted
      assert.ok(emittedEvent);
      const recorded = emittedEvent as {
        formId: string;
        submissionId: string;
        data: Record<string, unknown>;
      };
      assert.equal(recorded.formId, form.id);
      assert.equal(recorded.data["email"], "jane@example.com");

      // Verify list submissions
      const submissions = await service.listSubmissions(form.id, { page: 1, limit: 10 });
      assert.equal(submissions.meta.total, 1);
      assert.equal(submissions.data[0]?.data["name"], "Jane Doe");
    }
  });

  it("fails when captcha answer is incorrect and runs before field validation", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);
    const registry = new CaptchaRegistry(TEST_CAPTCHA_SECRET);
    const hooks = new HookManager();
    const service = new FormsService(repo, registry, hooks, stubLogger);

    const form = await service.createForm({
      title: "Feedback",
      fields: [{ name: "email", label: "Email", type: "email", required: true }],
      captchaProvider: "challenge",
    });

    const challenge = generateChallenge("alphanumeric", TEST_CAPTCHA_SECRET);

    // Send incorrect captcha with invalid fields — captcha failure should be caught first
    await assert.rejects(
      async () => {
        await service.submitForm(form.id, {
          email: "not-an-email", // invalid email
          captchaToken: challenge.captchaToken,
          captchaAnswer: "wrong-answer",
        });
      },
      (err: Error) =>
        err instanceof ValidationError && err.message.includes("Incorrect captcha answer"),
    );

    // Verify nothing saved
    const submissions = await service.listSubmissions(form.id, {});
    assert.equal(submissions.meta.total, 0);
  });

  it("skips captcha entirely when captchaProvider is 'none'", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);
    const registry = new CaptchaRegistry(TEST_CAPTCHA_SECRET);
    const hooks = new HookManager();
    const service = new FormsService(repo, registry, hooks, stubLogger);

    const form = await service.createForm({
      title: "No Captcha Form",
      fields: [{ name: "name", label: "Name", type: "text", required: true }],
      captchaProvider: "none",
    });

    const captchaRes = await service.generateCaptcha(form.id);
    assert.equal(captchaRes.captchaRequired, false);

    // Submit without any captcha fields
    const submitRes = await service.submitForm(form.id, {
      name: "Direct Submit",
    });
    assert.equal(submitRes.success, true);

    const list = await service.listSubmissions(form.id, {});
    assert.equal(list.meta.total, 1);
  });

  it("exports submissions in both xlsx and csv formats with proper headers and filenames", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);
    const registry = new CaptchaRegistry(TEST_CAPTCHA_SECRET);
    const hooks = new HookManager();
    const service = new FormsService(repo, registry, hooks, stubLogger);

    const form = await service.createForm({
      title: "Contact Support",
      slug: "contact-support",
      fields: [
        { name: "fullname", label: "Full Name", type: "text", required: true },
        { name: "department", label: "Department", type: "text", required: false },
      ],
      captchaProvider: "none",
    });

    await service.submitForm(
      form.id,
      { fullname: "Ayşe Yılmaz", department: "Destek" },
      { ip: "192.168.1.1", userAgent: "Mozilla/5.0" },
    );

    // Test Excel export
    const xlsxResult = await service.exportSubmissions(form.id, "xlsx");
    assert.ok(xlsxResult.filename.startsWith("contact-support-submissions-"));
    assert.ok(xlsxResult.filename.endsWith(".xlsx"));
    assert.equal(
      xlsxResult.contentType,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.ok(Buffer.isBuffer(xlsxResult.data));
    assert.equal((xlsxResult.data as Buffer).readUInt32LE(0), 0x04034b50);

    // Test CSV export
    const csvResult = await service.exportSubmissions(form.id, "csv");
    assert.ok(csvResult.filename.startsWith("contact-support-submissions-"));
    assert.ok(csvResult.filename.endsWith(".csv"));
    assert.equal(csvResult.contentType, "text/csv; charset=utf-8");
    assert.ok(typeof csvResult.data === "string");
    assert.ok(csvResult.data.startsWith("\uFEFF"));
    assert.ok(csvResult.data.includes("Full Name"));
    assert.ok(csvResult.data.includes("Ayşe Yılmaz"));
  });

  it("supports server-side pagination and search in listForms and listSubmissions", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);
    const registry = new CaptchaRegistry(TEST_CAPTCHA_SECRET);
    const hooks = new HookManager();
    const service = new FormsService(repo, registry, hooks, stubLogger);

    // Create 3 forms
    const f1 = await service.createForm({
      title: "Contact Form",
      slug: "contact",
      fields: [{ name: "name", label: "Name", type: "text" }],
      captchaProvider: "none",
    });
    await service.createForm({
      title: "Newsletter Signup",
      slug: "newsletter",
      fields: [{ name: "email", label: "Email", type: "email" }],
      captchaProvider: "none",
    });
    await service.createForm({
      title: "Survey Feedback",
      slug: "survey",
      fields: [{ name: "rating", label: "Rating", type: "number" }],
      captchaProvider: "none",
    });

    // Test listForms search
    const searchRes = await service.listForms({ search: "Newsletter" });
    assert.equal(searchRes.data.length, 1);
    assert.equal(searchRes.data[0]?.title, "Newsletter Signup");
    assert.equal(searchRes.meta.total, 1);

    // Test listForms pagination
    const paginatedRes = await service.listForms({ page: 2, limit: 2 });
    assert.equal(paginatedRes.meta.page, 2);
    assert.equal(paginatedRes.meta.limit, 2);
    assert.equal(paginatedRes.meta.total, 3);
    assert.equal(paginatedRes.meta.totalPages, 2);
    assert.equal(paginatedRes.data.length, 1);

    // Add submissions to f1
    await service.submitForm(f1.id, { name: "Alice" }, { ip: "10.0.0.1", userAgent: "Chrome" });
    await service.submitForm(f1.id, { name: "Bob" }, { ip: "192.168.1.1", userAgent: "Firefox" });
    await service.submitForm(f1.id, { name: "Charlie" }, { ip: "10.0.0.2", userAgent: "Safari" });

    // Test listSubmissions pagination
    const subPage1 = await service.listSubmissions(f1.id, { page: 1, limit: 2 });
    assert.equal(subPage1.meta.page, 1);
    assert.equal(subPage1.meta.limit, 2);
    assert.equal(subPage1.meta.total, 3);
    assert.equal(subPage1.meta.totalPages, 2);
    assert.equal(subPage1.data.length, 2);

    // Test listSubmissions search by IP
    const subSearch = await service.listSubmissions(f1.id, { search: "192.168" });
    assert.equal(subSearch.data.length, 1);
    assert.equal(subSearch.meta.total, 1);
    assert.equal(subSearch.data[0]?.ip, "192.168.1.1");
  });

  it("rejects replayed captcha tokens with ValidationError (atomic replay protection)", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);
    const registry = new CaptchaRegistry(TEST_CAPTCHA_SECRET);
    const hooks = new HookManager();
    const cache = createMockCache();
    const service = new FormsService(repo, registry, hooks, stubLogger, cache);

    const form = await service.createForm({
      title: "Secure Challenge Form",
      fields: [{ name: "email", label: "Email", type: "email", required: true }],
      captchaProvider: "challenge",
      challengeType: "alphanumeric",
    });

    const captchaRes = await service.generateCaptcha(form.id);
    assert.equal(captchaRes.captchaRequired, true);

    if (captchaRes.captchaRequired) {
      const code = captchaRes.question.replace("Enter code: ", "");

      // First submission succeeds
      const firstSubmit = await service.submitForm(form.id, {
        email: "first@example.com",
        captchaToken: captchaRes.captchaToken,
        captchaAnswer: code,
      });
      assert.equal(firstSubmit.success, true);

      // Replaying the exact same token fails immediately
      await assert.rejects(
        async () => {
          await service.submitForm(form.id, {
            email: "second@example.com",
            captchaToken: captchaRes.captchaToken,
            captchaAnswer: code,
          });
        },
        (err: Error) =>
          err instanceof ValidationError &&
          err.message.includes("Captcha challenge has already been used"),
      );
    }
  });

  it("enforces max length boundaries on text (<=500 chars) and textarea (<=10,000 chars)", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);
    const registry = new CaptchaRegistry(TEST_CAPTCHA_SECRET);
    const hooks = new HookManager();
    const service = new FormsService(repo, registry, hooks, stubLogger);

    const form = await service.createForm({
      title: "Boundary Test Form",
      fields: [
        { name: "shortText", label: "Summary", type: "text", required: true },
        { name: "longText", label: "Description", type: "textarea", required: true },
      ],
      captchaProvider: "none",
    });

    // Valid lengths succeed
    const validSubmit = await service.submitForm(form.id, {
      shortText: "a".repeat(500),
      longText: "b".repeat(10000),
    });
    assert.equal(validSubmit.success, true);

    // Text exceeding 500 chars fails
    await assert.rejects(
      async () => {
        await service.submitForm(form.id, {
          shortText: "a".repeat(501),
          longText: "normal text",
        });
      },
      (err: Error) =>
        err instanceof ValidationError &&
        err.message === "Field 'Summary' exceeds maximum length of 500 characters",
    );

    // Textarea exceeding 10,000 chars fails
    await assert.rejects(
      async () => {
        await service.submitForm(form.id, {
          shortText: "normal text",
          longText: "b".repeat(10001),
        });
      },
      (err: Error) =>
        err instanceof ValidationError &&
        err.message === "Field 'Description' exceeds maximum length of 10,000 characters",
    );
  });
});
