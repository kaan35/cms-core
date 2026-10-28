"use client";

import { ProtectedRoute } from "@cms/admin-shell";
import { ApiTokensList } from "@cms/plugin-auth-admin";

export default function ApiTokensPage() {
  return (
    <ProtectedRoute
      requiredPermission={["tokens:read", "tokens:write", "users:read", "auth:tokens:read"]}
    >
      <ApiTokensList />
    </ProtectedRoute>
  );
}
