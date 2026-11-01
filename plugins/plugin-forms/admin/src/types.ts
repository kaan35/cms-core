export interface FormSubmissionItem {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  ip?: string | undefined;
  userAgent?: string | undefined;
  createdAt: string;
}
