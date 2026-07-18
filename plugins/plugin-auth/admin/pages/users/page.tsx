"use client";

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
import { Edit3, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

export default function UsersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<{ id: string; email: string } | null>(null);
  const [page, setPage] = useState(1);
  const limit = 8;

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery<{ users: User[] }>(
    "/auth/users",
  );
  const users = data?.users || [];

  const totalPages = Math.ceil(users.length / limit);
  const paginatedUsers = users.slice((page - 1) * limit, page * limit);

  const { trigger: deleteUser } = useApiMutation({
    path: `/auth/users/${targetUser?.id}`,
    method: "DELETE",
    onSuccess: () => {
      refetch();
      showToast({ message: "User deleted successfully", type: "success" });
      setTargetUser(null);
      setIsConfirmOpen(false);
      // Adjust page if current page becomes empty after delete
      const newTotal = users.length - 1;
      const newTotalPages = Math.ceil(newTotal / limit);
      if (page > newTotalPages && newTotalPages > 0) {
        setPage(newTotalPages);
      }
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to delete user", type: "error" });
    },
  });

  const handleDeleteTrigger = (id: string, userEmail: string) => {
    setTargetUser({ id, email: userEmail });
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!targetUser) return;
    await deleteUser();
  };

  return (
    <div className="space-y-6">
      <DialogConfirm
        isOpen={isConfirmOpen}
        variant="destructive"
        title="Delete User Account"
        message={`Permanently delete the account for "${targetUser?.email}"? This action is irreversible.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetUser(null);
        }}
      />

      <PageHeader
        icon={Users}
        accent="amber"
        title="Users & RBAC"
        description="Manage system users, roles and permission policies"
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
            <Button variant="primary" icon={Plus} onClick={() => router.push("/users/new")}>
              New User
            </Button>
          </>
        }
      />

      <ErrorMessage error={error} fallback="Failed to load users" />

      {isLoading || isRefreshing ? (
        <SkeletonTable rows={6} columns={3} />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-0">
                    <EmptyState
                      icon={Users}
                      title="No users found"
                      description='Click "New User" to create the first account.'
                      className="border-0 rounded-none"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 text-xs font-semibold uppercase">
                          {user.email.slice(0, 2)}
                        </div>
                        <span className="truncate">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono hidden sm:table-cell">
                      {user.permissions.length > 0
                        ? `${user.permissions.length} policies`
                        : "No permissions"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Edit3}
                          onClick={() => router.push(`/users/${user.id}`)}
                        >
                          Manage
                        </Button>
                        <Button
                          size="icon"
                          variant="danger"
                          icon={Trash2}
                          aria-label={`Delete user ${user.email}`}
                          onClick={() => handleDeleteTrigger(user.id, user.email)}
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
              total: users.length,
              totalPages,
            }}
            page={page}
            onPageChange={setPage}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            itemLabel="users"
            className="px-2 pt-2"
          />
        </div>
      )}
    </div>
  );
}
