import { ProtectedRoute } from "@cms/admin-shell";
import { MediaPage } from "@cms/plugin-media-admin";

export default function DashboardMediaPage() {
  return (
    <ProtectedRoute requiredPermission={["media:read", "media:write"]}>
      <MediaPage />
    </ProtectedRoute>
  );
}
