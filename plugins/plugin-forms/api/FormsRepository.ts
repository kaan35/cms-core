import type { IDatabase, ILogger } from "@cms/core";
import type { Collection, Document } from "mongodb";
import { COLLECTIONS } from "./constants.ts";

export interface FormField {
  name: string;
  type: "text" | "email" | "textarea" | "number";
  label: string;
  placeholder?: string;
  required: boolean;
}

export interface Form extends Document {
  _id?: string;
  formId: string;
  name: string;
  fields: FormField[];
  createdAt?: Date;
}

export interface FormSubmission extends Document {
  _id?: string;
  formId: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

export class FormsRepository {
  private readonly db: IDatabase;
  private readonly logger: ILogger;
  private readonly formsCollection: Collection<Form>;
  private readonly submissionsCollection: Collection<FormSubmission>;

  constructor(db: IDatabase, logger: ILogger) {
    this.db = db;
    this.logger = logger;
    this.formsCollection = this.db.getCollection<Form>(COLLECTIONS.FORMS);
    this.submissionsCollection = this.db.getCollection<FormSubmission>(COLLECTIONS.FORM_SUBMISSIONS);
  }

  async find(): Promise<Form[]> {
    return this.formsCollection.find({}).toArray();
  }

  async findByFormId(formId: string): Promise<Form | null> {
    return this.formsCollection.findOne({ formId } as any);
  }

  async createForm(formData: Omit<Form, "createdAt">): Promise<Form> {
    const newForm: Form = {
      ...formData,
      createdAt: new Date(),
    } as Form;
    await this.formsCollection.insertOne(newForm as any);
    return newForm;
  }

  async updateForm(formId: string, name: string, fields: FormField[]): Promise<boolean> {
    const result = await this.formsCollection.updateOne(
      { formId } as any,
      { $set: { name, fields } } as any
    );
    return result.modifiedCount > 0;
  }

  async deleteForm(formId: string): Promise<boolean> {
    const result = await this.formsCollection.deleteOne({ formId } as any);
    return result.deletedCount > 0;
  }

  async createSubmission(formId: string, data: Record<string, unknown>): Promise<FormSubmission> {
    const submission: FormSubmission = {
      formId,
      data,
      createdAt: new Date(),
    } as FormSubmission;
    await this.submissionsCollection.insertOne(submission as any);
    return submission;
  }

  async countSubmissions(formId: string): Promise<number> {
    return this.submissionsCollection.countDocuments({ formId } as any);
  }

  async findSubmissions(formId: string, skip: number, limit: number): Promise<FormSubmission[]> {
    return this.submissionsCollection
      .find({ formId } as any)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }
}
