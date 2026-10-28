import { ProtectedRoute } from "@cms/admin-shell";
import { PagesListPage } from "@cms/plugin-pages-admin";

export default function PagesPage() {
  return (
    <ProtectedRoute requiredPermission={["pages:read:draft", "pages:write"]}>
      <PagesListPage />
    </ProtectedRoute>
  );
}
