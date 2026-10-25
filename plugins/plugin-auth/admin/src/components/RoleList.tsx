"use client";

import {
  api,
  Badge,
  Button,
  DialogDeleteConfirm,
  InputSearchField,
  PageHeader,
  SelectFilter,
  Skeleton,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  Tooltip,
  useApi,
} from "@cms/admin-shell";
import { Lock, Pencil, RefreshCw, Shield, ShieldCheck, ShieldPlus, Trash2 } from "lucide-react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import * as React from "react";
import { ALL_FLAT_PERMISSIONS } from "../constants/permissions";

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

  const [search, setSearch] = React.useState("");

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

  const [roleTypeFilter, setRoleTypeFilter] = React.useState<"all" | "system" | "custom">("all");

  const systemCount = React.useMemo(() => {
    return roles.filter((r) => r.isSystem).length;
  }, [roles]);

  const customCount = React.useMemo(() => {
    return roles.filter((r) => !r.isSystem).length;
  }, [roles]);

  const filteredRoles = React.useMemo(() => {
    return roles.filter((r) => {
      if (roleTypeFilter === "system" && !r.isSystem) return false;
      if (roleTypeFilter === "custom" && r.isSystem) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    });
  }, [roles, search, roleTypeFilter]);

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
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Unified PageHeader */}
      <PageHeader
        title="Role Templates"
        description="Pre-defined permission profiles to assign to team members"
        icon={Shield}
      />

      {/* KPI Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Roles"
          value={roles.length}
          description="Configured role templates"
          icon={Shield}
        />
        <StatCard
          title="System Roles"
          value={systemCount}
          description="Protected built-in profiles"
          icon={Lock}
        />
        <StatCard
          title="Custom Roles"
          value={customCount}
          description="User-defined permission sets"
          icon={ShieldCheck}
        />
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        {/* Unified Search & Action Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
            <InputSearchField
              placeholder="Filter roles by name or description..."
              value={search}
              onSearchChange={setSearch}
              containerClassName="w-full sm:max-w-sm"
              className="bg-card w-full"
            />

            <div className="w-36">
              <SelectFilter
                value={roleTypeFilter}
                onValueChange={setRoleTypeFilter}
                options={[
                  { value: "all", label: "All Roles" },
                  { value: "system", label: "System Roles" },
                  { value: "custom", label: "Custom Roles" },
                ]}
                placeholder="All Roles"
                className="h-8 text-xs min-w-36 w-full bg-card"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Tooltip content="Refresh roles">
              <Button
                variant="outline"
                size="icon"
                onClick={() => mutate()}
                iconStart={<RefreshCw />}
              />
            </Tooltip>
            <Button onClick={handleCreate} iconStart={<ShieldPlus />} className="w-full sm:w-auto">
              New Role
            </Button>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
                <Shield className="size-6 opacity-80" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No roles found</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                {search
                  ? "No roles match your search filter."
                  : "Create and manage customized access control roles and permissions."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="font-semibold">Role Name</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="w-40 font-semibold">Policies</TableHead>
                  <TableHead className="w-24 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((r) => (
                  <TableRow key={r.id} className="text-xs hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3 font-medium text-foreground">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {r.isSystem ? <Lock className="size-4" /> : <Shield className="size-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/roles/${r.id}`}
                              className="hover:text-primary transition-colors font-semibold"
                            >
                              {r.name === "admin"
                                ? "Administrator"
                                : r.name === "editor"
                                  ? "Editor"
                                  : r.name === "user"
                                    ? "User"
                                    : r.name}
                            </Link>
                            {r.isSystem && (
                              <Badge variant="secondary" className="text-[10px] gap-1 py-0 h-4">
                                <Lock className="size-2.5" /> System
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/80 block">
                            {r.name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {r.description || "—"}
                    </TableCell>
                    <TableCell>
                      {r.permissions?.includes("*") ||
                      r.permissions?.length === ALL_FLAT_PERMISSIONS.length ? (
                        <Badge
                          variant="default"
                          className="text-[11px] font-medium gap-1 bg-primary/15 text-primary border-primary/20 hover:bg-primary/20"
                        >
                          <ShieldCheck className="size-3" />
                          All Permissions ({ALL_FLAT_PERMISSIONS.length})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px]">
                          {r.permissions?.length || 0}{" "}
                          {r.permissions?.length === 1 ? "permission" : "permissions"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="Edit Role Template">
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(r)}>
                            <Pencil className="size-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </Tooltip>
                        {!r.isSystem && (
                          <Tooltip content="Delete Role">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteModal({ target: r, isDeleting: false })}
                              className="hover:text-destructive"
                            >
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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
