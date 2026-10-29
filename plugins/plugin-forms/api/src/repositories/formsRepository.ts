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

export interface IFormsRepository {
  create(input: CreateFormInput): Promise<FormDoc>;
  findById(id: string): Promise<FormDoc | null>;
  findBySlug(slug: string): Promise<FormDoc | null>;
  list(): Promise<FormDoc[]>;
  findPaginated(
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<{ items: FormDoc[]; total: number }>;
  update(id: string, input: UpdateFormInput): Promise<FormDoc>;
  delete(id: string): Promise<void>;
  deleteManySubmissions(formId: string): Promise<number>;
  createSubmission(
    formId: string,
    data: Record<string, unknown>,
    meta?: { ip?: string | undefined; userAgent?: string | undefined },
  ): Promise<FormSubmissionDoc>;
  listSubmissions(
    formId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<PaginatedResult<FormSubmissionDoc>>;
  getAllSubmissions(formId: string): Promise<FormSubmissionDoc[]>;
  countSubmissions(formId?: string): Promise<number>;
}

export class FormsRepository implements IFormsRepository {
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

  async findPaginated(
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<{ items: FormDoc[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (search && search.trim() !== "") {
      const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter["$or"] = [
        { title: { $regex: s, $options: "i" } },
        { slug: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
      ];
    }
    const skip = Math.max(0, (page - 1) * limit);
    const [items, total] = await Promise.all([
      this.formsCol.find(filter, { skip, limit, sort: { createdAt: -1 } }),
      this.formsCol.countDocuments(filter),
    ]);
    return { items, total };
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

  async deleteManySubmissions(formId: string): Promise<number> {
    if (this.submissionsCol.deleteMany) {
      const res = await this.submissionsCol.deleteMany({ formId });
      return res?.deletedCount ?? 0;
    }
    const submissions = await this.submissionsCol.find({ formId });
    await Promise.all(submissions.map((sub) => this.submissionsCol.deleteOne({ id: sub.id })));
    return submissions.length;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Form not found: ${id}`);
    }
    await this.formsCol.deleteOne({ id });
    await this.deleteManySubmissions(id);
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
    search?: string,
  ): Promise<PaginatedResult<FormSubmissionDoc>> {
    const filter: Record<string, unknown> = { formId };
    if (search && search.trim() !== "") {
      const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regexFilter = { $regex: s, $options: "i" };
      const orConditions: Record<string, unknown>[] = [
        { ip: regexFilter },
        { userAgent: regexFilter },
        { id: regexFilter },
      ];

      const form = await this.findById(formId);
      if (form?.fields && form.fields.length > 0) {
        for (const f of form.fields) {
          orConditions.push({ [`data.${f.name}`]: regexFilter });
        }
      }
      for (const commonKey of ["name", "email", "message", "subject", "phone"]) {
        if (!form?.fields?.some((f) => f.name === commonKey)) {
          orConditions.push({ [`data.${commonKey}`]: regexFilter });
        }
      }

      filter["$or"] = orConditions;
    }
    const skip = Math.max(0, (page - 1) * limit);
    const [items, total] = await Promise.all([
      this.submissionsCol.find(filter, { skip, limit, sort: { createdAt: -1 } }),
      this.submissionsCol.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getAllSubmissions(formId: string): Promise<FormSubmissionDoc[]> {
    return this.submissionsCol.find(
      { formId },
      {
        sort: { createdAt: -1 },
      },
    );
  }

  async countSubmissions(formId?: string): Promise<number> {
    const filter = formId ? { formId } : {};
    return this.submissionsCol.countDocuments(filter);
  }
}
