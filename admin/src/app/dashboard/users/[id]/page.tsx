import { ProtectedRoute } from "@cms/admin-shell";
import { UserPermissionsEditor } from "@cms/plugin-auth-admin";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ProtectedRoute requiredPermission={["users:read", "users:write"]}>
      <UserPermissionsEditor userId={id} />
    </ProtectedRoute>
  );
}
