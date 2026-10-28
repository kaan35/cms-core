import { ProtectedRoute } from "@cms/admin-shell";
import { FormEditorPage } from "@cms/plugin-forms-admin";

export default async function FormEditorPageRoute({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return (
    <ProtectedRoute requiredPermission={["forms:read", "forms:write"]}>
      <FormEditorPage id={formId} />
    </ProtectedRoute>
  );
}
