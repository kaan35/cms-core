"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Pencil, RefreshCw, Shield, ShieldPlus, Trash2 } from "lucide-react";
import {
  apiClient,
  Badge,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  toast,
  useApi,
} from "@cms/admin-shell";

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
  const [deleteTarget, setDeleteTarget] = React.useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ roles: RoleItem[] } | RoleItem[]>("/api/roles");

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
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/roles/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Role deleted successfully!");
      setDeleteTarget(null);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete role";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
          <Button size="sm" onClick={handleCreate} className="gap-1.5 text-xs h-8">
            <ShieldPlus className="size-3.5" />
            <span>New Role</span>
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
          <div className="p-8 text-center">
            <Shield className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium text-foreground">No roles configured</p>
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
                          onClick={() => setDeleteTarget(r)}
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

      {/* Custom Shadcn Delete Alert Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md p-5 rounded-2xl bg-card border-border/80 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">
              Delete Role Template
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Are you sure you want to delete role template{" "}
              <strong className="text-foreground font-semibold">"{deleteTarget?.name}"</strong>?
              Users currently assigned to this template will have their permissions decoupled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
            <AlertDialogCancel className="h-8 text-xs" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              <Trash2 className="size-3.5" />
              <span>{isDeleting ? "Deleting..." : "Delete Role"}</span>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
