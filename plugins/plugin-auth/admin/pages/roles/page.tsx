"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Loading } from "@/components/ui/Loading";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/Table";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { Edit3, Plus, RefreshCw, Shield, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export default function RolesListPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery<{
    roles: Array<{ _id: string; name: string; description?: string; permissions: string[] }>;
  }>("/auth/roles");

  const roles: Role[] =
    data?.roles?.map((r) => ({ ...r, id: r._id?.toString() || r._id })) || [];

  const { trigger: deleteRole } = useApiMutation({
    path: `/auth/roles/${targetRole?.id}`,
    method: "DELETE",
    onSuccess: () => {
      refetch();
      showToast({ message: "Role deleted successfully", type: "success" });
      setTargetRole(null);
      setIsConfirmOpen(false);
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to delete role", type: "error" });
    },
  });

  const handleDeleteConfirm = async () => {
    if (!targetRole) return;
    await deleteRole();
  };

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Role Template"
        message={`Are you sure you want to delete the "${targetRole?.name}" role? Users assigned to this role will not lose their permissions, but the template will be removed.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetRole(null);
        }}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role Templates</h1>
          <p className="text-sm text-zinc-400">
            Create permission templates to streamline user access management
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refetch()} isDisabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button icon={Plus} onClick={() => router.push("/roles/new")}>
            New Role
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message || "Failed to load roles"}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Role Name</TableCell>
            <TableCell isHeader>Description</TableCell>
            <TableCell isHeader>Permissions</TableCell>
            <TableCell isHeader className="text-right">
              Actions
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-12 text-center text-zinc-500">
                <Shield className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                <p>No role templates yet. Create one to streamline user management.</p>
              </TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-600/20 flex items-center justify-center">
                      <Shield className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <span className="font-semibold text-white">{role.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-400 text-sm">{role.description || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {role.permissions.slice(0, 4).map((p) => (
                      <span
                        key={p}
                        className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5"
                      >
                        {p}
                      </span>
                    ))}
                    {role.permissions.length > 4 && (
                      <span className="text-[10px] text-zinc-500 self-center">
                        +{role.permissions.length - 4} more
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Edit3}
                      onClick={() => router.push(`/roles/${role.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="danger"
                      icon={Trash2}
                      onClick={() => {
                        setTargetRole({ id: role.id, name: role.name });
                        setIsConfirmOpen(true);
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
