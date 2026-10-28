import { ProtectedRoute } from "@cms/admin-shell";
import { SubmissionsPage } from "@cms/plugin-forms-admin";

export default async function FormSubmissionsPageRoute({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return (
    <ProtectedRoute requiredPermission={["forms:read", "forms:write"]}>
      <SubmissionsPage formId={formId} />
    </ProtectedRoute>
  );
}
