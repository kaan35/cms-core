"use client";

import {
  api,
  type PaginatedResult,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  toast,
  useApi,
} from "@cms/admin-shell";
import { FileText } from "lucide-react";
import * as React from "react";
import { PageDeleteDialog } from "./components/PageDeleteDialog";
import { PageListToolbar } from "./components/PageListToolbar";
import { PageTableRow } from "./components/PageTableRow";

export interface PageListItem {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  pageType?: "standard" | "home" | undefined;
  blocks?: unknown[] | undefined;
  version?: number | undefined;
  updatedAt?: string | undefined;
  createdAt?: string | undefined;
}

export function PageList() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "published" | "draft">("all");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [deleteModal, setDeleteModal] = React.useState<{
    target: PageListItem | null;
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
    return `/api/pages?${params.toString()}`;
  }, [page, limit, search, statusFilter]);

  const { data: rawData, isLoading, mutate } = useApi<PaginatedResult<PageListItem>>(apiUrl);

  const pages: PageListItem[] = React.useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData.data)) return rawData.data;
    if (Array.isArray(rawData)) return rawData;
    return [];
  }, [rawData]);

  const totalCount = rawData?.meta?.total ?? pages.length;
  const totalPages = rawData?.meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / limit));

  const handleConfirmDelete = async () => {
    if (!deleteModal.target) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/pages/${deleteModal.target.id}`);
      toast.success(`Page "${deleteModal.target.title}" deleted`);
      setDeleteModal({ target: null, isDeleting: false });
      await mutate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete page";
      toast.error(message);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  return (
    <div className="space-y-4">
      <PageListToolbar
        search={search}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onRefresh={() => mutate()}
      />

      {/* Pages Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="font-semibold">Page Title</TableHead>
                <TableHead className="font-semibold">URL Slug</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Blocks</TableHead>
                <TableHead className="font-semibold">Last Updated</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
              <FileText className="size-6 opacity-80" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No pages found</h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search || statusFilter !== "all"
                ? "No pages matched your search filter or status criteria."
                : "Design and compose your first dynamic landing or content page."}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="font-semibold">Page Title</TableHead>
                  <TableHead className="font-semibold">URL Slug</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Blocks</TableHead>
                  <TableHead className="font-semibold">Last Updated</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((pageItem) => (
                  <PageTableRow
                    key={pageItem.id}
                    page={pageItem}
                    onDeleteRequest={(target) => setDeleteModal({ target, isDeleting: false })}
                  />
                ))}
              </TableBody>
            </Table>
            {(pages.length > 0 || totalCount > 0) && (
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

      <PageDeleteDialog
        target={deleteModal.target}
        isDeleting={deleteModal.isDeleting}
        onClose={() => setDeleteModal({ target: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
