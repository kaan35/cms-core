"use client";

import {
  api,
  Badge,
  Button,
  DialogDeleteConfirm,
  InputSearchField,
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
import { Pencil, RefreshCw, Trash2, UserPlus, Users } from "lucide-react";
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

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())),
  );

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
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Users & RBAC</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage user accounts, roles and permission sets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => mutate()} iconStart={<RefreshCw />}>
            Refresh
          </Button>
          <Button onClick={() => router.push("/dashboard/users/new")} iconStart={<UserPlus />}>
            New User
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <InputSearchField
        placeholder="Filter users by email or name..."
        value={search}
        onSearchChange={setSearch}
        containerClassName="max-w-sm"
        className="h-8 text-xs"
      />

      {/* Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
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
                <TableHead className="w-[35%]">User</TableHead>
                <TableHead className="w-[25%]">Role</TableHead>
                <TableHead className="w-[20%]">Status</TableHead>
                <TableHead className="w-[20%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className="text-xs group">
                  <TableCell>
                    <Link
                      href={`/dashboard/users/${u.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors block"
                    >
                      <div>{u.email}</div>
                      {u.name && <div className="text-[11px] text-muted-foreground">{u.name}</div>}
                    </Link>
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
                      <Link href={`/dashboard/users/${u.id}`}>
                        <Button variant="ghost" size="icon-sm" title="Edit User & Permissions">
                          <Pencil className="size-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteModal({ target: u, isDeleting: false })}
                        title="Delete User"
                        className="hover:text-destructive"
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
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
