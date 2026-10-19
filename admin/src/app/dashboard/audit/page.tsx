"use client";

import { AuditLogTable } from "@cms/plugin-system-admin";

export default function AuditTrailPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <AuditLogTable />
    </div>
  );
}
