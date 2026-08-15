import {
  assertUniqueSlug,
  buildPaginatedResult,
  generateSlug,
  NotFoundError,
  type ICollection,
  type IDatabase,
  type PaginatedResult,
} from "@cms/core";
import { randomUUID } from "node:crypto";
import type {
  CreateFormInput,
  FormDoc,
  FormSubmissionDoc,
  UpdateFormInput,
} from "../domain/form.rules.js";

export class FormsRepository {
  private formsCol: ICollection<FormDoc>;
  private submissionsCol: ICollection<FormSubmissionDoc>;

  constructor(db: IDatabase) {
    this.formsCol = db.collection<FormDoc>("cms_forms");
    this.submissionsCol = db.collection<FormSubmissionDoc>("cms_form_submissions");
  }

  async create(input: CreateFormInput): Promise<FormDoc> {
    const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.title);
    await assertUniqueSlug(this.formsCol, slug);

    const now = new Date().toISOString();
    const doc: FormDoc = {
      id: randomUUID(),
      title: input.title,
      slug,
      description: input.description,
      fields: input.fields,
      captchaProvider: input.captchaProvider ?? "challenge",
      challengeType: input.challengeType ?? "alphanumeric",
      submitButtonText: input.submitButtonText ?? "Submit",
      successMessage: input.successMessage ?? "Thank you for your submission.",
      createdAt: now,
      updatedAt: now,
    };

    await this.formsCol.insertOne(doc);
    return doc;
  }

  async findById(id: string): Promise<FormDoc | null> {
    return this.formsCol.findOne({ id });
  }

  async findBySlug(slug: string): Promise<FormDoc | null> {
    return this.formsCol.findOne({ slug });
  }

  async list(): Promise<FormDoc[]> {
    return this.formsCol.find({}, { sort: { createdAt: -1 } });
  }

  async update(id: string, input: UpdateFormInput): Promise<FormDoc> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Form not found: ${id}`);
    }

    let slug = existing.slug;
    if (input.slug !== undefined || (input.title !== undefined && input.title !== existing.title)) {
      const candidate = input.slug
        ? generateSlug(input.slug)
        : generateSlug(input.title ?? existing.title);
      if (candidate !== existing.slug) {
        await assertUniqueSlug(this.formsCol, candidate, id);
        slug = candidate;
      }
    }

    const now = new Date().toISOString();
    const updated: FormDoc = {
      ...existing,
      ...input,
      id: existing.id,
      title: input.title !== undefined ? input.title : existing.title,
      slug,
      fields: input.fields ?? existing.fields,
      captchaProvider: input.captchaProvider ?? existing.captchaProvider,
      challengeType: input.challengeType ?? existing.challengeType,
      submitButtonText: input.submitButtonText ?? existing.submitButtonText,
      successMessage: input.successMessage ?? existing.successMessage,
      updatedAt: now,
    };

    await this.formsCol.updateOne({ id }, { $set: updated });
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Form not found: ${id}`);
    }
    await this.formsCol.deleteOne({ id });
    const submissions = await this.submissionsCol.find({ formId: id });
    for (const sub of submissions) {
      await this.submissionsCol.deleteOne({ id: sub.id });
    }
  }

  async createSubmission(
    formId: string,
    data: Record<string, unknown>,
    meta?: { ip?: string | undefined; userAgent?: string | undefined },
  ): Promise<FormSubmissionDoc> {
    const now = new Date().toISOString();
    const doc: FormSubmissionDoc = {
      id: randomUUID(),
      formId,
      data,
      createdAt: now,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    };

    await this.submissionsCol.insertOne(doc);
    return doc;
  }

  async listSubmissions(
    formId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<FormSubmissionDoc>> {
    const filter = { formId };
    const total = await this.submissionsCol.countDocuments(filter);
    const skip = (page - 1) * limit;

    const items = await this.submissionsCol.find(filter, {
      sort: { createdAt: -1 },
      skip,
      limit,
    });

    return buildPaginatedResult(items, total, page, limit);
  }
}
