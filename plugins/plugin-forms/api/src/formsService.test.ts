import { HookManager, ValidationError, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateChallenge } from "./captcha/challengeProvider.js";
import { CaptchaRegistry } from "./captcha/registry.js";
import { FORMS_EVENTS } from "./domain/form.rules.js";
import { FormsService } from "./formsService.js";
import { FormsRepository } from "./repositories/formsRepository.js";

describe("FormsService", () => {
  it("submits form successfully with valid challenge captcha and emits form.submitted", async () => {
    const db = createInMemoryDb();
    const repo = new FormsRepository(db);
    const registry = new CaptchaRegistry("test-secret");
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
    const registry = new CaptchaRegistry("test-secret");
    const hooks = new HookManager();
    const service = new FormsService(repo, registry, hooks, stubLogger);

    const form = await service.createForm({
      title: "Feedback",
      fields: [{ name: "email", label: "Email", type: "email", required: true }],
      captchaProvider: "challenge",
    });

    const challenge = generateChallenge("alphanumeric", "test-secret");

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
    const registry = new CaptchaRegistry("test-secret");
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
});
