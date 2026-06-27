"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import { Users, Plus, Edit3, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Loading } from "@/components/ui/Loading";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";

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

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery<{ users: User[] }>(
    "/auth/users",
  );
  const users = data?.users || [];

  const { trigger: deleteUser } = useApiMutation({
    path: `/auth/users/${targetUser?.id}`,
    method: "DELETE",
    onSuccess: () => {
      refetch();
      showToast({ message: "User deleted successfully", type: "success" });
      setTargetUser(null);
      setIsConfirmOpen(false);
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

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete User Account"
        message={`Permanently delete the account for "${targetUser?.email}"? This action is irreversible.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetUser(null);
        }}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & RBAC</h1>
          <p className="text-sm text-zinc-400">
            Manage system users, roles and permission policies
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refetch()} isDisabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button icon={Plus} onClick={() => router.push("/users/new")}>
            New User
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message || "Failed to load users"}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>User</TableCell>
            <TableCell isHeader>Permissions</TableCell>
            <TableCell isHeader className="text-right">
              Actions
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-12 text-center text-zinc-500">
                <Users className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-white">{user.email}</TableCell>
                <TableCell className="text-zinc-400 text-sm font-mono">
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
                      onClick={() => handleDeleteTrigger(user.id, user.email)}
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
