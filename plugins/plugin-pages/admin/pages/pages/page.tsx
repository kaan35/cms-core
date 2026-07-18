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
import { Edit3, Layout, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PagesListPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [targetPageId, setTargetPageId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 8;

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery<{ pages: any[] }>("/pages");
  const pages = data?.pages || [];

  const totalPages = Math.ceil(pages.length / limit);
  const paginatedPages = pages.slice((page - 1) * limit, page * limit);

  const { trigger: deletePage } = useApiMutation({
    path: `/pages/${targetPageId}`,
    method: "DELETE",
    onSuccess: () => {
      refetch();
      showToast({ message: "Page deleted successfully", type: "success" });
      setTargetPageId(null);
      setIsConfirmOpen(false);
      // Adjust page if current page becomes empty after delete
      const newTotal = pages.length - 1;
      const newTotalPages = Math.ceil(newTotal / limit);
      if (page > newTotalPages && newTotalPages > 0) {
        setPage(newTotalPages);
      }
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

  return (
    <div className="space-y-6">
      <DialogConfirm
        isOpen={isConfirmOpen}
        variant="destructive"
        title="Delete Page Template"
        message={`Are you sure you want to permanently delete this page?`}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetPageId(null);
        }}
      />

      <PageHeader
        icon={Layout}
        accent="primary"
        title="Pages"
        description="Manage frontend pages and blocks composition"
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
            <Button variant="primary" onClick={() => router.push("/pages/new")} icon={Plus}>
              New Page
            </Button>
          </>
        }
      />

      <ErrorMessage error={error} fallback="Failed to load pages" />

      {isLoading || isRefreshing ? (
        <SkeletonTable rows={6} columns={4} />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="p-0">
                    <EmptyState
                      icon={Layout}
                      title="No pages created yet"
                      description="Pages are built from reusable content blocks."
                      className="border-0 rounded-none"
                      action={
                        <Button onClick={() => router.push("/pages/new")} icon={Plus}>
                          Create First Page
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPages.map((page) => (
                  <TableRow key={page._id} className="group/row">
                    <TableCell className="font-medium text-foreground py-4 max-w-0 w-full overflow-hidden">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Layout className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="font-semibold text-sm sm:text-base leading-snug truncate">
                            {page.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-normal overflow-hidden">
                            <span className="bg-muted border border-border/40 px-1.5 py-0.5 rounded truncate shrink min-w-0">
                              /{page.slug}
                            </span>
                            <span className="shrink-0">•</span>
                            <span className="shrink-0 whitespace-nowrap">
                              Created {new Date(page.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 opacity-30 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
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
                          aria-label={`Delete page ${page.title}`}
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
              total: pages.length,
              totalPages,
            }}
            page={page}
            onPageChange={setPage}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            itemLabel="pages"
            className="px-2 pt-2"
          />
        </div>
      )}
    </div>
  );
}
