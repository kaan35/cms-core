import type { IDatabase, ILogger } from "@cms/core";
import type { Collection, Filter, WithId, UpdateFilter } from "mongodb";
import { COLLECTIONS } from "./constants.ts";

export interface FormField {
  name: string;
  type: "text" | "email" | "textarea" | "number";
  label: string;
  placeholder?: string;
  required: boolean;
}

export interface Form {
  formId: string;
  name: string;
  fields: FormField[];
  createdAt?: Date;
}

export interface FormSubmission {
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

  async find(): Promise<WithId<Form>[]> {
    return await this.formsCollection.find({}).toArray();
  }

  async findByFormId(formId: string): Promise<WithId<Form> | null> {
    return await this.formsCollection.findOne({ formId } as Filter<Form>);
  }

  async createForm(formData: Omit<Form, "createdAt">): Promise<WithId<Form>> {
    const newForm: Form = {
      ...formData,
      createdAt: new Date(),
    };
    const result = await this.formsCollection.insertOne(newForm as any);
    return { ...newForm, _id: result.insertedId } as WithId<Form>;
  }

  async updateForm(formId: string, name: string, fields: FormField[]): Promise<boolean> {
    const result = await this.formsCollection.updateOne(
      { formId } as Filter<Form>,
      { $set: { name, fields } } as UpdateFilter<Form>
    );
    return result.modifiedCount > 0;
  }

  async deleteForm(formId: string): Promise<boolean> {
    const result = await this.formsCollection.deleteOne({ formId } as Filter<Form>);
    return result.deletedCount > 0;
  }

  async createSubmission(formId: string, data: Record<string, unknown>): Promise<WithId<FormSubmission>> {
    const submission: FormSubmission = {
      formId,
      data,
      createdAt: new Date(),
    };
    const result = await this.submissionsCollection.insertOne(submission as any);
    return { ...submission, _id: result.insertedId } as WithId<FormSubmission>;
  }

  async countSubmissions(formId: string): Promise<number> {
    return await this.submissionsCollection.countDocuments({ formId } as Filter<FormSubmission>);
  }

  async findSubmissions(formId: string, skip: number, limit: number): Promise<WithId<FormSubmission>[]> {
    return await this.submissionsCollection
      .find({ formId } as Filter<FormSubmission>)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }
}
