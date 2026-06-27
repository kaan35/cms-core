"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { UserForm } from "@/components/UserForm";
import { Loading } from "@/components/ui/Loading";

interface RoleTemplate {
  id: string;
  name: string;
  permissions: string[];
}

export default function UserNewPage() {
  const [roles, setRoles] = useState<RoleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await apiFetch("/auth/roles");
        setRoles(
          data.roles?.map((r: any) => ({
            id: r._id?.toString() || r.id,
            name: r.name,
            permissions: r.permissions || [],
          })) || []
        );
      } catch (err) {
        console.error("Failed to load roles:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New User</h1>
          <p className="text-sm text-zinc-400">
            Create a new user account with custom permissions
          </p>
        </div>
      </div>

      <UserForm mode="create" roles={roles} />
    </div>
  );
}
