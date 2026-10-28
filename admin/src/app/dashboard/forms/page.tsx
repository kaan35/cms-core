import { ProtectedRoute } from "@cms/admin-shell";
import { FormsListPage } from "@cms/plugin-forms-admin";

export default function FormsPage() {
  return (
    <ProtectedRoute requiredPermission={["forms:read", "forms:write"]}>
      <FormsListPage />
    </ProtectedRoute>
  );
}
