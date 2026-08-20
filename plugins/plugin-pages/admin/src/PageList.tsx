"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  toast,
  useApi,
} from "@cms/admin-shell";
import { FileEdit, FileText, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export interface PageListItem {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  blocks?: unknown[] | undefined;
  version?: number | undefined;
  updatedAt?: string | undefined;
  createdAt?: string | undefined;
}

export function PageList() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "published" | "draft">("all");
  const [deleteModal, setDeleteModal] = React.useState<{
    target: PageListItem | null;
    isDeleting: boolean;
  }>({
    target: null,
    isDeleting: false,
  });

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<
    | {
        data: PageListItem[];
        total: number;
      }
    | PageListItem[]
  >("/api/pages");

  const pages: PageListItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const filteredPages = React.useMemo(() => {
    return pages.filter((page) => {
      const matchSearch =
        page.title.toLowerCase().includes(search.toLowerCase()) ||
        page.slug.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter !== "all" && page.status !== statusFilter) return false;
      return true;
    });
  }, [pages, search, statusFilter]);

  const handleConfirmDelete = async () => {
    if (!deleteModal.target) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await apiClient(`/api/pages/${deleteModal.target.id}`, { method: "DELETE" });
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
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card w-full"
            />
          </div>

          <div className="flex items-center rounded-lg border border-border/80 bg-card p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === "published"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Published
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === "draft"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Drafts
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="border-border/80 shrink-0"
          >
            <RefreshCw className="size-3.5" />
          </Button>

          <Link href="/dashboard/pages/new" className="flex-1 sm:flex-none">
            <Button className="gap-2 shadow-xs w-full sm:w-auto">
              <Plus className="size-4" />
              Create Page
            </Button>
          </Link>
        </div>
      </div>

      {/* Pages Table */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        {isLoading ? (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
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
        ) : filteredPages.length === 0 ? (
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
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-semibold">Page Title</TableHead>
                <TableHead className="font-semibold">URL Slug</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Blocks</TableHead>
                <TableHead className="font-semibold">Last Updated</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPages.map((page) => (
                <TableRow key={page.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileEdit className="size-3.5" />
                      </div>
                      <Link
                        href={`/dashboard/pages/${page.id}`}
                        className="text-foreground hover:text-primary transition-colors"
                      >
                        {page.title}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    /{page.slug}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={page.status === "published" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {page.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {page.blocks?.length || 0} blocks
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/pages/${page.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteModal({ target: page, isDeleting: false })}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={Boolean(deleteModal.target)}
        onOpenChange={(open) => !open && setDeleteModal({ target: null, isDeleting: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteModal.target?.title}&quot;? This will
              remove the page and all of its blocks from the live site and system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs gap-1.5" disabled={deleteModal.isDeleting}>
              <X className="size-3.5" />
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5"
              loading={deleteModal.isDeleting}
              iconStart={<Trash2 className="size-3.5" />}
              onClick={handleConfirmDelete}
            >
              {deleteModal.isDeleting ? "Deleting..." : "Delete Page"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
