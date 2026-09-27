"use client";

import {
  api,
  Badge,
  Button,
  DialogDeleteConfirm,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  useApi,
} from "@cms/admin-shell";
import { Lock, Pencil, RefreshCw, Shield, ShieldPlus, Trash2 } from "lucide-react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import * as React from "react";

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
}

export function RoleList() {
  const router = useRouter();

  // Deletion alert dialog state
  const [deleteModal, setDeleteModal] = React.useState<{
    target: RoleItem | null;
    isDeleting: boolean;
  }>({
    target: null,
    isDeleting: false,
  });

  const { data: rawData, isLoading, mutate } = useApi<{ roles: RoleItem[] } | RoleItem[]>("/roles");

  const rawObj = rawData as { roles?: RoleItem[]; data?: RoleItem[]; items?: RoleItem[] } | null;
  const roles: RoleItem[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawObj?.roles)
      ? rawObj.roles
      : Array.isArray(rawObj?.data)
        ? rawObj.data
        : Array.isArray(rawObj?.items)
          ? rawObj.items
          : [];

  const handleConfirmDelete = async () => {
    if (!deleteModal.target) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/roles/${deleteModal.target.id}`);
      toast.success("Role deleted successfully!");
      setDeleteModal({ target: null, isDeleting: false });
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete role";
      toast.error(msg);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleEdit = (r: RoleItem) => {
    router.push(`/dashboard/roles/${r.id}`);
  };

  const handleCreate = () => {
    router.push("/dashboard/roles/new");
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Role Templates</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pre-defined permission profiles to assign to team members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => mutate()} iconStart={<RefreshCw />}>
            Refresh
          </Button>
          <Button onClick={handleCreate} iconStart={<ShieldPlus />}>
            New Role
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
              <Shield className="size-6 opacity-80" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No roles configured</h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              Create and manage customized access control roles and permissions.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="w-[30%]">Role Name</TableHead>
                <TableHead className="w-[35%]">Description</TableHead>
                <TableHead className="w-[20%]">Policies</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id} className="text-xs">
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Link
                        href={`/dashboard/roles/${r.id}`}
                        className="hover:text-primary transition-colors font-semibold"
                      >
                        {r.name}
                      </Link>
                      {r.isSystem && (
                        <Badge variant="secondary" className="text-[10px] gap-1 py-0 h-4">
                          <Lock className="size-2.5" /> System
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    {r.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px]">
                      {r.permissions?.length || 0} permissions
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(r)}
                        title="Edit Role"
                      >
                        <Pencil className="size-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      {!r.isSystem && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteModal({ target: r, isDeleting: false })}
                          title="Delete Role"
                          className="hover:text-destructive"
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <DialogDeleteConfirm
        open={Boolean(deleteModal.target)}
        onClose={() => setDeleteModal({ target: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Role Template"
        itemTitle={deleteModal.target?.name}
        description="Users currently assigned to this template will have their permissions decoupled."
        confirmLabel="Delete Role"
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
}
