import { ProtectedRoute } from "@cms/admin-shell";
import { PluginManager } from "@cms/plugin-system-admin";

export default function PluginsPage() {
  return (
    <ProtectedRoute requiredPermission={["system:plugins:read", "system:plugins:write"]}>
      <PluginManager />
    </ProtectedRoute>
  );
}
