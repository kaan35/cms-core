import { ValidationError } from "@cms/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type FormDoc, validateCreateForm, validateSubmission } from "./form.rules.js";

describe("form.rules", () => {
  it("validates valid form creation payload", () => {
    const valid = validateCreateForm({
      title: "Contact Form",
      fields: [
        { name: "fullName", label: "Full Name", type: "text", required: true },
        { name: "email", label: "Email Address", type: "email", required: true },
        { name: "age", label: "Age", type: "number" },
        {
          name: "department",
          label: "Department",
          type: "select",
          options: ["Sales", "Support", "General"],
        },
        { name: "agree", label: "I agree to terms", type: "checkbox" },
      ],
      captchaProvider: "challenge",
      challengeType: "alphanumeric",
    });

    assert.equal(valid.title, "Contact Form");
    assert.equal(valid.fields.length, 5);
    assert.equal(valid.captchaProvider, "challenge");
    assert.equal(valid.challengeType, "alphanumeric");
  });

  it("throws ValidationError for invalid form creation (missing fields, bad field name)", () => {
    assert.throws(() => validateCreateForm({ title: "" }), ValidationError);

    assert.throws(
      () =>
        validateCreateForm({
          title: "Test",
          fields: [],
        }),
      ValidationError,
    );

    assert.throws(
      () =>
        validateCreateForm({
          title: "Test",
          fields: [{ name: "bad name with spaces", label: "Bad", type: "text" }],
        }),
      ValidationError,
    );
  });

  it("validates dynamic submissions against form definitions", () => {
    const form: FormDoc = {
      id: "form-1",
      title: "Feedback",
      slug: "feedback",
      fields: [
        { name: "email", label: "Email Address", type: "email", required: true },
        { name: "rating", label: "Rating", type: "number", required: true },
        {
          name: "category",
          label: "Category",
          type: "select",
          required: false,
          options: ["Bug", "Feature"],
        },
        { name: "subscribe", label: "Subscribe", type: "checkbox", required: false },
      ],
      captchaProvider: "challenge",
      challengeType: "alphanumeric",
      submitButtonText: "Send",
      successMessage: "Thanks",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Valid submission
    const clean = validateSubmission(form, {
      email: "user@example.com",
      rating: "5",
      category: "Bug",
      subscribe: true,
      extraField: "ignored",
    });

    assert.equal(clean["email"], "user@example.com");
    assert.equal(clean["rating"], 5);
    assert.equal(clean["category"], "Bug");
    assert.equal(clean["subscribe"], true);
    assert.equal(clean["extraField"], undefined);

    // Required missing
    assert.throws(
      () => validateSubmission(form, { rating: 5 }),
      (err: Error) => err instanceof ValidationError && err.message.includes("Email Address"),
    );

    // Invalid email
    assert.throws(
      () => validateSubmission(form, { email: "not-an-email", rating: 5 }),
      (err: Error) => err instanceof ValidationError && err.message.includes("valid email"),
    );

    // Invalid number
    assert.throws(
      () => validateSubmission(form, { email: "a@b.com", rating: "abc" }),
      (err: Error) => err instanceof ValidationError && err.message.includes("valid number"),
    );

    // Invalid select option
    assert.throws(
      () => validateSubmission(form, { email: "a@b.com", rating: 4, category: "InvalidOption" }),
      (err: Error) => err instanceof ValidationError && err.message.includes("Invalid selection"),
    );
  });
});
