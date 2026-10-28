import { ProtectedRoute } from "@cms/admin-shell";
import { VaultListPage } from "@cms/plugin-vault-admin";

export default function VaultPage() {
  return (
    <ProtectedRoute requiredPermission={["vault:read", "vault:write"]}>
      <VaultListPage />
    </ProtectedRoute>
  );
}
