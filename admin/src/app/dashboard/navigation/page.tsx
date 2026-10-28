import { ProtectedRoute } from "@cms/admin-shell";
import { NavigationManager } from "@cms/plugin-system-admin";

export default function NavigationDashboardPage() {
  return (
    <ProtectedRoute requiredPermission={["navigation:read", "navigation:write"]}>
      <NavigationManager />
    </ProtectedRoute>
  );
}
