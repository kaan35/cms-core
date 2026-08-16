"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, RefreshCw, Search, Trash2, UserPlus, Users } from "lucide-react";
import {
  apiClient,
  Badge,
  Button,
  Input,
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
  const [deleteTarget, setDeleteTarget] = React.useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ data: UserItem[] } | UserItem[]>("/api/users");

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
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("User deleted successfully!");
      setDeleteTarget(null);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete user";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => router.push("/dashboard/users/new")}
            className="gap-1.5 text-xs h-8"
          >
            <UserPlus className="size-3.5" />
            <span>New User</span>
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Filter users by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-8 text-xs"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium text-foreground">No users found</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {search ? "Try adjusting your search criteria" : "Get started by adding a user"}
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
                        onClick={() => setDeleteTarget(u)}
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

      {/* Custom Shadcn Delete Alert Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md p-5 rounded-2xl bg-card border-border/80 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Are you sure you want to delete user{" "}
              <strong className="text-foreground font-semibold">{deleteTarget?.email}</strong>? This
              action is permanent and will revoke all associated sessions and permissions.
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
              <span>{isDeleting ? "Deleting..." : "Delete User"}</span>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
