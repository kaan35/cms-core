"use client";

import { RoleForm } from "@/components/RoleForm";

export default function RoleNewPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Role Template</h1>
          <p className="text-sm text-zinc-400">
            Define a reusable permission set that can be assigned to users
          </p>
        </div>
      </div>

      <RoleForm mode="create" />
    </div>
  );
}
