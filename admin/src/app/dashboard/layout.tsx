import * as React from "react";
import { AdminLayout, ProtectedRoute } from "@cms/admin-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
