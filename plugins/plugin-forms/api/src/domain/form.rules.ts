import { EVENTS, PERMISSIONS, ValidationError, validateWithSchema } from "@cms/core";
import { z } from "zod";

// 1. Permissions & Events
export const FORMS_PERMISSIONS = {
  READ: PERMISSIONS.FORMS.READ,
  WRITE: PERMISSIONS.FORMS.WRITE,
} as const;

export const FORMS_EVENTS = {
  SUBMITTED: EVENTS.FORMS.SUBMITTED,
} as const;

// 2. Field & Form Schemas
export const FormFieldTypeSchema = z.enum([
  "text",
  "email",
  "textarea",
  "number",
  "select",
  "checkbox",
]);

export const FormFieldSchema = z.object({
  name: z
    .string()
    .min(1, "Field name is required")
    .max(64)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Field name must contain only alphanumeric characters, dashes, or underscores",
    ),
  label: z.string().min(1, "Field label is required").max(128),
  type: FormFieldTypeSchema,
  required: z.boolean().default(false),
  placeholder: z.string().max(255).optional(),
  options: z.array(z.string().min(1)).optional(),
});

export const CaptchaProviderEnum = z.enum(["none", "challenge"]);
export const ChallengeTypeEnum = z.enum(["alphanumeric", "math"]);

export const CreateFormSchema = z.object({
  title: z.string().min(1, "Form title is required").max(255),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be URL-safe (lowercase letters, numbers, hyphens)",
    )
    .optional(),
  description: z.string().max(1000).optional(),
  fields: z.array(FormFieldSchema).min(1, "Form must have at least one field"),
  captchaProvider: CaptchaProviderEnum.default("challenge"),
  challengeType: ChallengeTypeEnum.default("alphanumeric"),
  submitButtonText: z.string().max(64).default("Submit"),
  successMessage: z.string().max(500).default("Thank you for your submission."),
});

export const UpdateFormSchema = CreateFormSchema.partial();

// 3. Domain Interfaces
export type FormField = z.infer<typeof FormFieldSchema>;
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;
export type CaptchaProviderType = z.infer<typeof CaptchaProviderEnum>;
export type ChallengeType = z.infer<typeof ChallengeTypeEnum>;
export type CreateFormInput = z.infer<typeof CreateFormSchema>;
export type UpdateFormInput = z.infer<typeof UpdateFormSchema>;

export interface FormDoc {
  id: string;
  title: string;
  slug: string;
  description?: string | undefined;
  fields: FormField[];
  captchaProvider: CaptchaProviderType;
  challengeType: ChallengeType;
  submitButtonText: string;
  successMessage: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface FormSubmissionDoc {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  createdAt: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
  [key: string]: unknown;
}

// 4. Validation Helpers
export function validateCreateForm(input: unknown): CreateFormInput {
  return validateWithSchema(CreateFormSchema, input, "Invalid form payload");
}

export function validateUpdateForm(input: unknown): UpdateFormInput {
  return validateWithSchema(UpdateFormSchema, input, "Invalid form update payload");
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function validateSubmission(form: FormDoc, input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError("Submission payload must be a JSON object");
  }

  const rawData = input as Record<string, unknown>;
  const cleanData: Record<string, unknown> = {};

  for (const field of form.fields) {
    const val = rawData[field.name];

    // Check required
    if (field.required) {
      if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        throw new ValidationError(`Field '${field.label}' is required`);
      }
    }

    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
      continue;
    }

    // Type validation
    if (field.type === "email") {
      if (typeof val !== "string" || !EMAIL_REGEX.test(val.trim())) {
        throw new ValidationError(`Field '${field.label}' must be a valid email address`);
      }
      cleanData[field.name] = val.trim();
    } else if (field.type === "number") {
      const num = Number(val);
      if (isNaN(num)) {
        throw new ValidationError(`Field '${field.label}' must be a valid number`);
      }
      cleanData[field.name] = num;
    } else if (field.type === "select") {
      const strVal = String(val);
      if (field.options && !field.options.includes(strVal)) {
        throw new ValidationError(`Invalid selection '${strVal}' for field '${field.label}'`);
      }
      cleanData[field.name] = strVal;
    } else if (field.type === "checkbox") {
      cleanData[field.name] = Boolean(val);
    } else {
      cleanData[field.name] = String(val);
    }
  }

  return cleanData;
}
