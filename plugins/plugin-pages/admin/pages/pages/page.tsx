"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Loading } from "@/components/ui/Loading";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/Table";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { Edit3, Layout, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PagesListPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [targetPageId, setTargetPageId] = useState<string | null>(null);

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery<{ pages: any[] }>(
    "/pages",
  );
  const pages = data?.pages || [];

  const { trigger: deletePage } = useApiMutation({
    path: `/pages/${targetPageId}`,
    method: "DELETE",
    onSuccess: () => {
      refetch();
      showToast({ message: "Page deleted successfully", type: "success" });
      setTargetPageId(null);
      setIsConfirmOpen(false);
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to delete page", type: "error" });
    },
  });

  const handleDeleteTrigger = (id: string) => {
    setTargetPageId(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!targetPageId) return;
    await deletePage();
  };

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Page Template"
        message={`Are you sure you want to permanently delete this page?`}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetPageId(null);
        }}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
          <p className="text-sm text-zinc-400">Manage frontend pages and blocks composition</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => refetch()} isDisabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="primary" onClick={() => router.push("/pages/new")} icon={Plus}>
            New Page
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message || "Failed to load pages"}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Page Title</TableCell>
            <TableCell isHeader>Slug</TableCell>
            <TableCell isHeader>Created</TableCell>
            <TableCell isHeader className="text-right">
              Actions
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-zinc-500">
                <Layout className="h-12 w-12 text-zinc-700 mb-2 mx-auto" />
                <p className="text-zinc-400 font-medium">No pages created yet</p>
                <Button className="mt-4" onClick={() => router.push("/pages/new")} icon={Plus}>
                  Create First Page
                </Button>
              </TableCell>
            </TableRow>
          ) : (
            pages.map((page) => (
              <TableRow key={page._id}>
                <TableCell className="font-bold text-white">{page.title}</TableCell>
                <TableCell className="font-mono text-zinc-400">/{page.slug}</TableCell>
                <TableCell className="text-xs text-zinc-400">
                  {new Date(page.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/pages/${page._id}`)}
                      icon={Edit3}
                    >
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="danger"
                      onClick={() => handleDeleteTrigger(page._id)}
                      icon={Trash2}
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
