import { ProtectedRoute } from "@cms/admin-shell";
import { RoleList } from "@cms/plugin-auth-admin";

export default function RolesPage() {
  return (
    <ProtectedRoute requiredPermission={["roles:read", "roles:write"]}>
      <RoleList />
    </ProtectedRoute>
  );
}
