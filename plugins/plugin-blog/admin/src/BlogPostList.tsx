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
import { BookOpen, FileText, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverMediaId?: string | undefined;
  status: "published" | "draft";
  version?: number | undefined;
  updatedAt?: string | undefined;
  createdAt?: string | undefined;
}

export function BlogPostList() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "published" | "draft">("all");
  const [deleteModal, setDeleteModal] = React.useState<{
    target: BlogPostListItem | null;
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
        data: BlogPostListItem[];
        total: number;
      }
    | BlogPostListItem[]
  >("/api/blog");

  const posts: BlogPostListItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const filteredPosts = React.useMemo(() => {
    return posts.filter((post) => {
      const matchSearch =
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.slug.toLowerCase().includes(search.toLowerCase()) ||
        (post.summary && post.summary.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === "all" || post.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [posts, search, statusFilter]);

  const handleDeleteConfirm = async () => {
    if (!deleteModal.target) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await apiClient(`/api/blog/${deleteModal.target.id}`, { method: "DELETE" });
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
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search posts by title or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs w-full"
            />
          </div>

          <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs self-start sm:self-auto">
            {(["all", "published", "draft"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 text-xs capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => mutate()}
            title="Refresh blog posts"
            className="h-8 w-8 shrink-0 border-border/80"
          >
            <RefreshCw className="size-3.5" />
          </Button>

          <Link href="/dashboard/blog/new" className="flex-1 sm:flex-none">
            <Button
              size="sm"
              className="h-8 w-full sm:w-auto gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>New Post</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : filteredPosts.length === 0 ? (
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="w-[45%]">Post Details</TableHead>
                <TableHead className="w-[18%]">Status</TableHead>
                <TableHead className="w-[17%]">Last Modified</TableHead>
                <TableHead className="w-[20%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => (
                <TableRow key={post.id} className="text-xs hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-start gap-3">
                      {post.coverMediaId ? (
                        <div className="size-10 rounded-lg overflow-hidden border border-border/80 shrink-0 bg-muted">
                          <img src={post.coverMediaId} alt="" className="size-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5">
                          <FileText className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/dashboard/blog/${post.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors block truncate"
                        >
                          {post.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            /blog/{post.slug}
                          </span>
                          {post.version && (
                            <span className="text-[10px] text-muted-foreground/80">
                              • v{post.version}
                            </span>
                          )}
                        </div>
                        {post.summary && (
                          <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                            {post.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {post.status === "published" ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px] gap-1 py-0.5"
                      >
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Published
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground border-border text-[11px] gap-1 py-0.5"
                      >
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                        Draft
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-[11px] text-muted-foreground">
                    {post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : "—"}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/blog/${post.id}`}>
                        <Button variant="ghost" size="icon-xs" title="Edit Article">
                          <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteModal({ target: post, isDeleting: false })}
                        title="Delete Article"
                        className="hover:text-destructive"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Modal */}
      <AlertDialog
        open={Boolean(deleteModal.target)}
        onOpenChange={(open) => !open && setDeleteModal({ target: null, isDeleting: false })}
      >
        <AlertDialogContent className="max-w-md p-5 rounded-2xl bg-card border-border/80 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">
              Delete Blog Post
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-foreground font-semibold">
                "{deleteModal.target?.title}"
              </strong>
              ? This action cannot be undone and will remove the post and its version history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
            <AlertDialogCancel className="h-8 text-xs gap-1.5" disabled={deleteModal.isDeleting}>
              <X className="size-3.5" />
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5"
              onClick={handleDeleteConfirm}
              loading={deleteModal.isDeleting}
              iconStart={<Trash2 className="size-3.5" />}
            >
              {deleteModal.isDeleting ? "Deleting..." : "Delete Post"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
