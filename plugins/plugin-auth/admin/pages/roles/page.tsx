"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DialogConfirm } from "@/components/ui/DialogConfirm";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
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
  const [page, setPage] = useState(1);
  const limit = 8;

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery<{
    roles: Array<{ _id: string; name: string; description?: string; permissions: string[] }>;
  }>("/auth/roles");

  const roles: Role[] = data?.roles?.map((r) => ({ ...r, id: r._id?.toString() || r._id })) || [];

  const totalPages = Math.ceil(roles.length / limit);
  const paginatedRoles = roles.slice((page - 1) * limit, page * limit);

  const { trigger: deleteRole } = useApiMutation({
    path: `/auth/roles/${targetRole?.id}`,
    method: "DELETE",
    onSuccess: () => {
      refetch();
      showToast({ message: "Role deleted successfully", type: "success" });
      setTargetRole(null);
      setIsConfirmOpen(false);
      const newTotal = roles.length - 1;
      const newTotalPages = Math.ceil(newTotal / limit);
      if (page > newTotalPages && newTotalPages > 0) {
        setPage(newTotalPages);
      }
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to delete role", type: "error" });
    },
  });

  const handleDeleteConfirm = async () => {
    if (!targetRole) return;
    await deleteRole();
  };

  return (
    <div className="space-y-6">
      <DialogConfirm
        isOpen={isConfirmOpen}
        variant="destructive"
        confirmText="Delete"
        title="Delete Role Template"
        message={`Are you sure you want to delete the "${targetRole?.name}" role? Users assigned to this role will not lose their permissions, but the template will be removed.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetRole(null);
        }}
      />

      <PageHeader
        icon={Shield}
        accent="rose"
        title="Role Templates"
        description="Create permission templates to streamline user access management"
        actions={
          <>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => refetch()}
              isDisabled={isRefreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => router.push("/roles/new")}>
              New Role
            </Button>
          </>
        }
      />

      <ErrorMessage error={error} fallback="Failed to load roles" />

      {isLoading || isRefreshing ? (
        <SkeletonTable rows={6} columns={4} />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead className="sm:table-cell">Description</TableHead>
                <TableHead className="md:table-cell">Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-0">
                    <EmptyState
                      icon={Shield}
                      title="No role templates yet"
                      description="Create one to streamline user management."
                      className="border-0 rounded-none"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                          <Shield className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground">{role.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm sm:table-cell">
                      {role?.description && role?.description?.length > 60
                        ? `${role?.description?.substring(0, 60)}...`
                        : role?.description || "—"}
                    </TableCell>
                    <TableCell className="md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-xs items-center">
                        {role.permissions.slice(0, 3).map((p) => (
                          <Badge key={p} variant="neutral" className="font-mono text-[10px]">
                            {p}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{role.permissions.length - 3} more
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
                          aria-label={`Delete role ${role.name}`}
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

          <Pagination
            meta={{
              page,
              limit,
              total: roles.length,
              totalPages,
            }}
            page={page}
            onPageChange={setPage}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            itemLabel="roles"
            className="px-2 pt-2"
          />
        </div>
      )}
    </div>
  );
}
