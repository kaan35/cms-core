import {
  NotFoundError,
  ValidationError,
  parsePaginationQuery,
  type IHookManager,
  type ILogger,
  type PaginatedResult,
} from "@cms/core";
import {
  ChallengeCaptchaProvider,
  generateChallenge,
  type ChallengeData,
} from "./captcha/challengeProvider.js";
import type { CaptchaRegistry } from "./captcha/registry.js";
import {
  FORMS_EVENTS,
  validateCreateForm,
  validateSubmission,
  validateUpdateForm,
  type FormDoc,
  type FormSubmissionDoc,
} from "./domain/form.rules.js";
import type { FormsRepository } from "./repositories/formsRepository.js";
import { generateCsv, generateXlsx } from "./utils/exportUtils.js";

export interface ExportSubmissionsResult {
  filename: string;
  contentType: string;
  data: Buffer | string;
}

export interface SubmitFormResult {
  success: boolean;
  message: string;
  submissionId?: string | undefined;
}

export type CaptchaResponse =
  { captchaRequired: false } | ({ captchaRequired: true } & ChallengeData);

export class FormsService {
  private repo: FormsRepository;
  private captchaRegistry: CaptchaRegistry;
  private hooks: IHookManager;
  private logger: ILogger;

  constructor(
    repo: FormsRepository,
    captchaRegistry: CaptchaRegistry,
    hooks: IHookManager,
    logger: ILogger,
  ) {
    this.repo = repo;
    this.captchaRegistry = captchaRegistry;
    this.hooks = hooks;
    this.logger = logger;
  }

  async createForm(input: unknown): Promise<FormDoc> {
    const validated = validateCreateForm(input);
    const form = await this.repo.create(validated);
    this.logger.info("Form created", { id: form.id, slug: form.slug, title: form.title });
    return form;
  }

  async getForm(id: string): Promise<FormDoc & { submissionCount: number }> {
    const form = await this.repo.findById(id);
    if (!form) {
      throw new NotFoundError(`Form not found: ${id}`);
    }
    const submissionCount = await this.repo.countSubmissions(form.id);
    return {
      ...form,
      submissionCount,
    };
  }

  async getFormBySlug(slug: string): Promise<FormDoc & { submissionCount: number }> {
    const form = await this.repo.findBySlug(slug);
    if (!form) {
      throw new NotFoundError(`Form not found: ${slug}`);
    }
    const submissionCount = await this.repo.countSubmissions(form.id);
    return {
      ...form,
      submissionCount,
    };
  }

  async listForms(): Promise<(FormDoc & { submissionCount: number })[]> {
    const forms = await this.repo.list();
    return Promise.all(
      forms.map(async (form) => {
        const submissionCount = await this.repo.countSubmissions(form.id);
        return {
          ...form,
          submissionCount,
        };
      }),
    );
  }

  async updateForm(id: string, input: unknown): Promise<FormDoc> {
    const validated = validateUpdateForm(input);
    const form = await this.repo.update(id, validated);
    this.logger.info("Form updated", { id: form.id, slug: form.slug });
    return form;
  }

  async deleteForm(id: string): Promise<void> {
    await this.repo.delete(id);
    this.logger.info("Form deleted", { id });
  }

  async generateCaptcha(formIdentifier: string): Promise<CaptchaResponse> {
    const form =
      (await this.repo.findById(formIdentifier)) || (await this.repo.findBySlug(formIdentifier));
    if (!form) {
      throw new NotFoundError(`Form not found: ${formIdentifier}`);
    }

    if (form.captchaProvider === "none") {
      return { captchaRequired: false };
    }

    const provider = this.captchaRegistry.getRequired(form.captchaProvider);
    if (provider instanceof ChallengeCaptchaProvider) {
      const challenge = provider.generate(form.challengeType);
      return {
        captchaRequired: true,
        ...challenge,
      };
    }

    const challenge = generateChallenge(form.challengeType);
    return {
      captchaRequired: true,
      ...challenge,
    };
  }

  async submitForm(
    formIdentifier: string,
    payload: unknown,
    meta?: { ip?: string | undefined; userAgent?: string | undefined },
  ): Promise<SubmitFormResult> {
    const form =
      (await this.repo.findById(formIdentifier)) || (await this.repo.findBySlug(formIdentifier));
    if (!form) {
      throw new NotFoundError(`Form not found: ${formIdentifier}`);
    }

    const rawData =
      typeof payload === "object" && payload !== null && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {};

    // 1. Pluggable Captcha Check FIRST
    const provider = this.captchaRegistry.getRequired(form.captchaProvider);
    const verifyResult = await provider.verify(rawData);

    if (!verifyResult.passed) {
      if (verifyResult.onFailure === "silent-success") {
        this.logger.warn("Spam submission dropped silently", { formId: form.id });
        return { success: true, message: form.successMessage };
      }
      throw new ValidationError(verifyResult.error || "Captcha validation failed");
    }

    // 2. Dynamic Field Validation SECOND
    const cleanData = validateSubmission(form, payload);

    // 3. Persist Submission
    const submission = await this.repo.createSubmission(form.id, cleanData, meta);

    // 4. Emit Hook Event
    await this.hooks.emit(FORMS_EVENTS.SUBMITTED, {
      formId: form.id,
      submissionId: submission.id,
      data: cleanData,
    });

    this.logger.info("Form submitted successfully", {
      formId: form.id,
      submissionId: submission.id,
    });

    return {
      success: true,
      message: form.successMessage,
      submissionId: submission.id,
    };
  }

  async listSubmissions(
    formId: string,
    query: unknown,
  ): Promise<PaginatedResult<FormSubmissionDoc>> {
    // Verify form exists
    await this.getForm(formId);
    const { page, limit } = parsePaginationQuery(query);
    return this.repo.listSubmissions(formId, page, limit);
  }

  async exportSubmissions(
    formId: string,
    format: "csv" | "xlsx" = "xlsx",
  ): Promise<ExportSubmissionsResult> {
    const form = await this.getForm(formId);
    const submissions = await this.repo.getAllSubmissions(formId);

    // Determine headers from defined form fields + audit metadata
    const fieldDefs = form.fields.map((f) => ({
      key: f.name,
      label: f.label && f.label.trim().length > 0 ? f.label : f.name,
    }));

    const headers = [
      ...fieldDefs.map((f) => f.label),
      "Submitted At",
      "IP Address",
      "User Agent",
      "Submission ID",
    ];

    const rows = submissions.map((sub) => [
      ...fieldDefs.map((f) => sub.data?.[f.key] ?? ""),
      sub.createdAt,
      sub.ip ?? "",
      sub.userAgent ?? "",
      sub.id,
    ]);

    const dateSlug = new Date().toISOString().slice(0, 10);
    const safeSlug = (form.slug || form.id).toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    if (format === "csv") {
      return {
        filename: `${safeSlug}-submissions-${dateSlug}.csv`,
        contentType: "text/csv; charset=utf-8",
        data: generateCsv(headers, rows),
      };
    }

    return {
      filename: `${safeSlug}-submissions-${dateSlug}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: generateXlsx(headers, rows),
    };
  }
}
