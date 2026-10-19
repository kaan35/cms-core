"use client";

import {
  api,
  Badge,
  Button,
  DialogDeleteConfirm,
  InputSearchField,
  PageHeader,
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
import { Pencil, RefreshCw, ShieldCheck, Trash2, UserCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import * as React from "react";

interface UserItem {
  id: string;
  email: string;
  role: string;
  name?: string;
  status?: string;
  createdAt?: string;
}

export function UserList() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  // Deletion modal state
  const [deleteModal, setDeleteModal] = React.useState<{
    target: UserItem | null;
    isDeleting: boolean;
  }>({
    target: null,
    isDeleting: false,
  });

  const { data: rawData, isLoading, mutate } = useApi<{ data: UserItem[] } | UserItem[]>("/users");

  const rawObj = rawData as { data?: UserItem[]; users?: UserItem[]; items?: UserItem[] } | null;
  const users: UserItem[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawObj?.data)
      ? rawObj.data
      : Array.isArray(rawObj?.users)
        ? rawObj.users
        : Array.isArray(rawObj?.items)
          ? rawObj.items
          : [];

  const adminCount = React.useMemo(() => {
    return users.filter((u) => u.role === "admin").length;
  }, [users]);

  const activeCount = React.useMemo(() => {
    return users.filter((u) => u.status !== "suspended").length;
  }, [users]);

  const [roleFilter, setRoleFilter] = React.useState<"all" | "admin" | "member">("all");

  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      if (roleFilter === "admin" && u.role !== "admin") return false;
      if (roleFilter === "member" && u.role === "admin") return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const handleConfirmDelete = async () => {
    if (!deleteModal.target) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/users/${deleteModal.target.id}`);
      toast.success("User deleted successfully!");
      setDeleteModal({ target: null, isDeleting: false });
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete user";
      toast.error(msg);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Unified PageHeader */}
      <PageHeader
        title="Users & RBAC"
        description="Manage user accounts, roles and permission sets"
        icon={Users}
      />

      {/* KPI Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Users"
          value={users.length}
          description="Registered user accounts"
          icon={Users}
        />
        <StatCard
          title="Administrators"
          value={adminCount}
          description="Full management privileges"
          icon={ShieldCheck}
        />
        <StatCard
          title="Active Accounts"
          value={activeCount}
          description="Operational member profiles"
          icon={UserCheck}
        />
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        {/* Unified Search & Action Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
            <InputSearchField
              placeholder="Filter users by email, name, or role..."
              value={search}
              onSearchChange={setSearch}
              containerClassName="w-full sm:max-w-sm"
              className="bg-card w-full"
            />

            <div className="flex items-center rounded-lg border border-border/80 bg-card p-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRoleFilter("all")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  roleFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("admin")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  roleFilter === "admin"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admins
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("member")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  roleFilter === "member"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Members
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Tooltip content="Refresh users">
              <Button
                variant="outline"
                size="icon"
                onClick={() => mutate()}
                iconStart={<RefreshCw />}
              />
            </Tooltip>
            <Button
              onClick={() => router.push("/dashboard/users/new")}
              iconStart={<UserPlus />}
              className="w-full sm:w-auto"
            >
              New User
            </Button>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
                <Users className="size-6 opacity-80" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No users found</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                {search
                  ? "No users matched your search criteria."
                  : "Get started by creating your first administrative user account."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="w-36 font-semibold">Role</TableHead>
                  <TableHead className="w-28 font-semibold">Status</TableHead>
                  <TableHead className="w-24 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow
                    key={u.id}
                    className="text-xs group hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                          <Users className="size-4" />
                        </div>
                        <Link
                          href={`/dashboard/users/${u.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors block"
                        >
                          <div className="font-semibold">{u.email}</div>
                          {u.name && (
                            <div className="text-[11px] text-muted-foreground">{u.name}</div>
                          )}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {u.role || "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="Edit User & Permissions">
                          <Link href={`/dashboard/users/${u.id}`}>
                            <Button variant="ghost" size="icon-sm">
                              <Pencil className="size-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </Link>
                        </Tooltip>
                        <Tooltip content="Delete User">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteModal({ target: u, isDeleting: false })}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="size-4 text-muted-foreground" />
                          </Button>
                        </Tooltip>
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
        title="Delete User Account"
        itemTitle={
          deleteModal.target?.name
            ? `${deleteModal.target.name} (${deleteModal.target.email})`
            : deleteModal.target?.email
        }
        description="This action is permanent and will revoke all associated sessions and permissions."
        confirmLabel="Delete User"
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
}
