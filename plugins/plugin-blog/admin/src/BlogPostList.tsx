"use client";

import {
  api,
  type PaginatedResult,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  toast,
  useApi,
} from "@cms/admin-shell";
import { BookOpen } from "lucide-react";
import * as React from "react";
import { BlogPostDeleteDialog } from "./components/BlogPostDeleteDialog";
import { BlogPostListToolbar } from "./components/BlogPostListToolbar";
import { BlogPostTableRow } from "./components/BlogPostTableRow";
import type { BlogPostListItem } from "./components/blogTypes";

export type { BlogPostListItem };

export function BlogPostList() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "published" | "draft">("all");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [deleteModal, setDeleteModal] = React.useState<{
    target: BlogPostListItem | null;
    isDeleting: boolean;
  }>({
    target: null,
    isDeleting: false,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilterChange = (status: "all" | "published" | "draft") => {
    setStatusFilter(status);
    setPage(1);
  };

  const apiUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    return `/api/blog?${params.toString()}`;
  }, [page, limit, search, statusFilter]);

  const { data: rawData, isLoading, mutate } = useApi<PaginatedResult<BlogPostListItem>>(apiUrl);

  const posts: BlogPostListItem[] = React.useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData.data)) return rawData.data;
    if (Array.isArray(rawData)) return rawData;
    return [];
  }, [rawData]);

  const totalCount = rawData?.meta?.total ?? posts.length;
  const totalPages = rawData?.meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / limit));

  const handleDeleteConfirm = async () => {
    if (!deleteModal.target) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/blog/${deleteModal.target.id}`);
      toast.success(`Post "${deleteModal.target.title}" deleted`);
      setDeleteModal({ target: null, isDeleting: false });
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete blog post");
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  return (
    <div className="space-y-4">
      <BlogPostListToolbar
        search={search}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onRefresh={() => mutate()}
      />

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
              <BookOpen className="size-6 opacity-80" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No blog posts found</h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Get started by publishing your first article or saving a draft."}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="font-semibold">Post Details</TableHead>
                  <TableHead className="w-32 font-semibold">Status</TableHead>
                  <TableHead className="w-44 font-semibold">Last Modified</TableHead>
                  <TableHead className="w-24 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <BlogPostTableRow
                    key={post.id}
                    post={post}
                    onDeleteClick={(target) => setDeleteModal({ target, isDeleting: false })}
                  />
                ))}
              </TableBody>
            </Table>
            {(posts.length > 0 || totalCount > 0) && (
              <TablePagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      <BlogPostDeleteDialog
        target={deleteModal.target}
        isDeleting={deleteModal.isDeleting}
        onClose={() => setDeleteModal({ target: null, isDeleting: false })}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
