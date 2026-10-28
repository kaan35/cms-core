"use client";

import { ProtectedRoute } from "@cms/admin-shell";
import { AuditLogTable } from "@cms/plugin-system-admin";

export default function AuditTrailPage() {
  return (
    <ProtectedRoute requiredPermission="system:audit-log:read">
      <div className="space-y-6 animate-in fade-in duration-300">
        <AuditLogTable />
      </div>
    </ProtectedRoute>
  );
}
