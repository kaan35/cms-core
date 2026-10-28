import { ProtectedRoute } from "@cms/admin-shell";
import { SystemSettingsPage } from "@cms/plugin-system-admin";

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredPermission={["system:settings:read", "system:settings:write"]}>
      <SystemSettingsPage />
    </ProtectedRoute>
  );
}
