"use client";

import {
  api,
  Badge,
  Button,
  DialogConfirm,
  DialogDeleteConfirm,
  InputSearchField,
  PageHeader,
  type PaginatedResult,
  SelectFilter,
  Skeleton,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  toast,
  Tooltip,
  useApi,
} from "@cms/admin-shell";
import {
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
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
  const [roleFilter, setRoleFilter] = React.useState<"all" | "admin" | "member">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "suspended">("all");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  // Deletion modal state
  const [deleteModal, setDeleteModal] = React.useState<{
    target: UserItem | null;
    isDeleting: boolean;
  }>({
    target: null,
    isDeleting: false,
  });

  // Status toggle confirmation modal state
  const [suspendModal, setSuspendModal] = React.useState<{
    target: UserItem | null;
    action: "suspend" | "activate";
    isSubmitting: boolean;
  }>({
    target: null,
    action: "suspend",
    isSubmitting: false,
  });

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  if (roleFilter !== "all") queryParams.set("role", roleFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  const endpoint = `/users?${queryParams.toString()}`;

  const { data: rawData, isLoading, mutate } = useApi<PaginatedResult<UserItem>>(endpoint);
  const users: UserItem[] = rawData?.data || [];
  const meta = rawData?.meta;

  const adminCount = React.useMemo(() => {
    return users.filter((u) => u.role === "admin").length;
  }, [users]);

  const activeCount = React.useMemo(() => {
    return users.filter((u) => u.status !== "suspended").length;
  }, [users]);

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

  const handleConfirmToggleStatus = async () => {
    if (!suspendModal.target) return;
    const { target, action } = suspendModal;
    setSuspendModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await api.put(`/users/${target.id}`, {
        status: action === "suspend" ? "suspended" : "active",
      });
      toast.success(
        action === "suspend"
          ? `User ${target.email} suspended and active sessions revoked.`
          : `User ${target.email} activated successfully.`,
      );
      setSuspendModal({ target: null, action: "suspend", isSubmitting: false });
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update user status";
      toast.error(msg);
      setSuspendModal((prev) => ({ ...prev, isSubmitting: false }));
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
          value={meta?.total ?? users.length}
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
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              containerClassName="w-full sm:max-w-sm"
              className="bg-card w-full"
            />

            <div className="w-32">
              <SelectFilter
                value={roleFilter}
                onValueChange={(val) => {
                  setRoleFilter(val);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Roles" },
                  { value: "admin", label: "Admins" },
                  { value: "member", label: "Members" },
                ]}
                placeholder="All Roles"
                className="h-8 text-xs min-w-32 w-full bg-card"
              />
            </div>

            <div className="w-32">
              <SelectFilter
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "active", label: "Active" },
                  { value: "suspended", label: "Suspended" },
                ]}
                placeholder="All Statuses"
                className="h-8 text-xs min-w-32 w-full bg-card"
              />
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
          ) : users.length === 0 ? (
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
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="w-36 font-semibold">Role</TableHead>
                    <TableHead className="w-28 font-semibold">Status</TableHead>
                    <TableHead className="w-28 text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
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
                        {u.status === "suspended" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                            <span className="size-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.status === "suspended" ? (
                            <Tooltip content="Activate User">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  setSuspendModal({
                                    target: u,
                                    action: "activate",
                                    isSubmitting: false,
                                  })
                                }
                                className="text-emerald-500 hover:text-emerald-400"
                              >
                                <UserCheck className="size-4" />
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip content="Suspend User">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  setSuspendModal({
                                    target: u,
                                    action: "suspend",
                                    isSubmitting: false,
                                  })
                                }
                                className="text-muted-foreground hover:text-rose-500"
                              >
                                <UserX className="size-4" />
                              </Button>
                            </Tooltip>
                          )}
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
              <TablePagination
                page={page}
                totalPages={
                  meta?.totalPages ?? Math.max(1, Math.ceil((meta?.total ?? users.length) / limit))
                }
                totalCount={meta?.total ?? users.length}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            </>
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

      <DialogConfirm
        open={Boolean(suspendModal.target)}
        onClose={() => setSuspendModal({ target: null, action: "suspend", isSubmitting: false })}
        onConfirm={handleConfirmToggleStatus}
        title={
          suspendModal.action === "suspend" ? "Suspend User Account" : "Reactivate User Account"
        }
        description={
          suspendModal.action === "suspend"
            ? `Are you sure you want to suspend user ${suspendModal.target?.email}? All active sessions will be terminated immediately and they will be barred from logging in.`
            : `Are you sure you want to reactivate user ${suspendModal.target?.email}? They will regain access to log in with their assigned role.`
        }
        confirmLabel={suspendModal.action === "suspend" ? "Suspend User" : "Reactivate User"}
        confirmVariant={suspendModal.action === "suspend" ? "destructive" : "default"}
        confirmIcon={suspendModal.action === "suspend" ? <UserX /> : <UserCheck />}
        isLoading={suspendModal.isSubmitting}
      />
    </div>
  );
}
