"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { RoleForm } from "@/components/RoleForm";
import { Loading } from "@/components/ui/Loading";

export default function RoleEditPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const roleId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [roleData, setRoleData] = useState<{
    name: string;
    description: string;
    permissions: string[];
  } | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const data = await apiFetch(`/auth/roles/${roleId}`);
        const role = data.role;
        setRoleData({
          name: role.name,
          description: role.description || "",
          permissions: role.permissions || [],
        });
        setIsLoading(false);
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 404) {
          showToast({ message: "Role not found", type: "error" });
        } else if (err instanceof ApiError && err.status === 400) {
          showToast({ message: err.message || "Invalid role ID", type: "error" });
        } else {
          showToast({ message: "Failed to load role", type: "error" });
          console.error("Failed to load role:", err);
        }
        // Redirect after showing error
        router.push("/roles");
      }
    };

    fetchRole();
  }, [roleId, router, showToast]);

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  if (!roleData) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Role: {roleData.name}</h1>
          <p className="text-sm text-zinc-400">
            Update permission template and role configuration
          </p>
        </div>
      </div>

      <RoleForm mode="update" roleId={roleId} initialData={roleData} />
    </div>
  );
}
