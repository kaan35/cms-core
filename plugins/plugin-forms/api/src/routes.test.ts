import { decorateTestAuth, HookManager, stubLogger } from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import fastify from "fastify";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CaptchaRegistry } from "./captcha/registry.js";
import { FormsController } from "./formsController.js";
import { FormsService } from "./formsService.js";
import { FormsRepository } from "./repositories/formsRepository.js";
import { registerFormsRoutes } from "./routes.js";

async function buildTestApp() {
  const app = fastify();
  const db = createInMemoryDb();
  const repo = new FormsRepository(db);
  const captchaRegistry = new CaptchaRegistry("test-captcha-secret-key-32-chars-minimum");
  const hooks = new HookManager();
  const service = new FormsService(repo, captchaRegistry, hooks, stubLogger);
  const controller = new FormsController(service);

  decorateTestAuth(app);

  registerFormsRoutes(app, controller);
  await app.ready();
  return { app, repo, service };
}

describe("plugin-forms routes & workflows", () => {
  it("CRUD forms and handles public submissions with challenge captcha", async () => {
    const { app } = await buildTestApp();

    // 1. Create Form (Admin)
    const createRes = await app.inject({
      method: "POST",
      url: "/forms",
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "forms:write",
      },
      payload: {
        title: "Contact Form",
        fields: [
          { name: "name", label: "Your Name", type: "text", required: true },
          { name: "email", label: "Your Email", type: "email", required: true },
          { name: "message", label: "Message", type: "textarea", required: true },
        ],
        captchaProvider: "challenge",
        challengeType: "alphanumeric",
      },
    });

    assert.equal(createRes.statusCode, 201);
    const form = JSON.parse(createRes.body).form;
    assert.equal(form.title, "Contact Form");
    assert.equal(form.slug, "contact-form");

    // 2. Fetch Form Definition (Public unauthenticated client embed)
    const publicFormRes = await app.inject({
      method: "GET",
      url: `/forms/${form.id}`,
    });
    assert.equal(publicFormRes.statusCode, 200);
    assert.equal(JSON.parse(publicFormRes.body).form.title, "Contact Form");

    // 3. Request Captcha (Public)
    const captchaRes = await app.inject({
      method: "GET",
      url: `/forms/${form.id}/captcha`,
    });
    assert.equal(captchaRes.statusCode, 200);
    const captcha = JSON.parse(captchaRes.body);
    assert.equal(captcha.captchaRequired, true);
    assert.ok(captcha.captchaToken);
    const code = captcha.question.replace("Enter code: ", "");

    // 3. Public submission with invalid captcha -> 400 Bad Request
    const failSubmitRes = await app.inject({
      method: "POST",
      url: `/forms/${form.id}/submissions`,
      payload: {
        name: "Bot",
        email: "bot@example.com",
        message: "Spam content",
        captchaToken: captcha.captchaToken,
        captchaAnswer: "wrong-code",
      },
    });
    assert.equal(failSubmitRes.statusCode, 400);

    // 4. Public submission with valid captcha -> 201 Created
    const successSubmitRes = await app.inject({
      method: "POST",
      url: `/forms/${form.id}/submissions`,
      payload: {
        name: "Alice Smith",
        email: "alice@example.com",
        message: "Hello world!",
        captchaToken: captcha.captchaToken,
        captchaAnswer: code,
      },
    });
    assert.equal(successSubmitRes.statusCode, 201);
    const submitBody = JSON.parse(successSubmitRes.body);
    assert.equal(submitBody.success, true);
    assert.ok(submitBody.submissionId);

    // 5. Admin lists submissions
    const listSubmissionsRes = await app.inject({
      method: "GET",
      url: `/forms/${form.id}/submissions`,
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "forms:read",
      },
    });
    assert.equal(listSubmissionsRes.statusCode, 200);
    const submissions = JSON.parse(listSubmissionsRes.body);
    assert.equal(submissions.meta.total, 1);
    assert.equal(submissions.data[0].data["name"], "Alice Smith");
    assert.equal(submissions.data[0].data["email"], "alice@example.com");

    // 6. Admin exports submissions as Excel (.xlsx)
    const exportXlsxRes = await app.inject({
      method: "GET",
      url: `/forms/${form.id}/submissions/export?format=xlsx`,
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "forms:read",
      },
    });
    assert.equal(exportXlsxRes.statusCode, 200);
    assert.equal(
      exportXlsxRes.headers["content-type"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.ok(exportXlsxRes.headers["content-disposition"]?.includes("contact-form-submissions-"));
    // Buffer starts with PK signature
    assert.equal(exportXlsxRes.rawPayload.readUInt32LE(0), 0x04034b50);

    // 7. Admin exports submissions as CSV (.csv)
    const exportCsvRes = await app.inject({
      method: "GET",
      url: `/forms/${form.id}/submissions/export?format=csv`,
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "forms:read",
      },
    });
    assert.equal(exportCsvRes.statusCode, 200);
    assert.equal(exportCsvRes.headers["content-type"], "text/csv; charset=utf-8");
    assert.ok(exportCsvRes.body.startsWith("\uFEFF"));
    assert.ok(exportCsvRes.body.includes("Alice Smith"));
    assert.ok(exportCsvRes.body.includes("alice@example.com"));

    // 8. Public cannot export submissions -> 401 Unauthorized
    const publicExportRes = await app.inject({
      method: "GET",
      url: `/forms/${form.id}/submissions/export`,
    });
    assert.equal(publicExportRes.statusCode, 401);

    // 9. Public cannot list submissions -> 401 Unauthorized
    const publicListRes = await app.inject({
      method: "GET",
      url: `/forms/${form.id}/submissions`,
    });
    assert.equal(publicListRes.statusCode, 401);

    // 7. Update Form
    const updateRes = await app.inject({
      method: "PUT",
      url: `/forms/${form.id}`,
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "forms:write",
      },
      payload: {
        title: "Contact Form Updated",
      },
    });
    assert.equal(updateRes.statusCode, 200);
    assert.equal(JSON.parse(updateRes.body).form.title, "Contact Form Updated");

    // 8. Delete Form
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/forms/${form.id}`,
      headers: {
        "x-test-user": "admin-1",
        "x-test-perms": "forms:write",
      },
    });
    assert.equal(deleteRes.statusCode, 200);
  });
});
