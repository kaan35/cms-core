import { FormEditorPage } from "@cms/plugin-forms-admin";

export default async function FormEditorPageRoute({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <FormEditorPage id={formId} />;
}
