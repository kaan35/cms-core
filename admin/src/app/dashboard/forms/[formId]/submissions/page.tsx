import { SubmissionsPage } from "@cms/plugin-forms-admin";

export default async function FormSubmissionsPageRoute({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <SubmissionsPage formId={formId} />;
}
