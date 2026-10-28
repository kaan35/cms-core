import { ProtectedRoute } from "@cms/admin-shell";
import { UserList } from "@cms/plugin-auth-admin";

export default function UsersPage() {
  return (
    <ProtectedRoute requiredPermission={["users:read", "users:write"]}>
      <UserList />
    </ProtectedRoute>
  );
}
