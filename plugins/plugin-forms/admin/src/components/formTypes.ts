export interface FormListItem {
  id: string;
  title: string;
  slug: string;
  description?: string | undefined;
  fields: unknown[];
  captchaProvider: "none" | "challenge";
  challengeType: "alphanumeric" | "math";
  submitButtonText: string;
  successMessage: string;
  createdAt: string;
  updatedAt: string;
}
