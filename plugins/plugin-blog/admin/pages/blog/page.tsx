"use client";

import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DialogConfirm } from "@/components/ui/DialogConfirm";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
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
import { BookOpen, Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

export default function BlogListPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [targetPost, setTargetPost] = useState<{ id: string; title: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [page, setPage] = useState(1);
  const limit = 8;

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery<{ posts: BlogPost[] }>(
    "/blog",
  );
  const posts = data?.posts || [];

  const filteredPosts =
    statusFilter === "all" ? posts : posts.filter((post) => post.status === statusFilter);

  const totalPages = Math.ceil(filteredPosts.length / limit);
  const paginatedPosts = filteredPosts.slice((page - 1) * limit, page * limit);

  // Delete mutation
  const { trigger: deletePost } = useApiMutation({
    path: `/blog/${targetPost?.id}`,
    method: "DELETE",
    onSuccess: () => {
      refetch();
      showToast({ message: "Blog post deleted successfully", type: "success" });
      setTargetPost(null);
      setIsConfirmOpen(false);
      // Adjust page if current page becomes empty after delete
      const newTotal = filteredPosts.length - 1;
      const newTotalPages = Math.ceil(newTotal / limit);
      if (page > newTotalPages && newTotalPages > 0) {
        setPage(newTotalPages);
      }
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to delete blog post", type: "error" });
    },
  });

  const handleDeleteTrigger = (postId: string, postTitle: string) => {
    setTargetPost({ id: postId, title: postTitle });
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!targetPost) return;
    await deletePost();
  };

  return (
    <div className="space-y-6">
      <DialogConfirm
        isOpen={isConfirmOpen}
        title="Delete Blog Post"
        variant="destructive"
        message={`Are you sure you want to permanently delete the blog post "${targetPost?.title}"?`}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetPost(null);
        }}
      />

      <PageHeader
        icon={BookOpen}
        accent="teal"
        title="Blog Posts"
        description="Create, publish, and manage website articles"
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "draft" | "published");
                setPage(1);
              }}
              className="w-auto"
            >
              <option value="all">All Posts</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
            </Select>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => refetch()}
              isDisabled={isRefreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="primary" onClick={() => router.push("/blog/new")} icon={Plus}>
              New Post
            </Button>
          </>
        }
      />

      <ErrorMessage error={error} fallback="Failed to load blog posts" />

      {isLoading || isRefreshing ? (
        <SkeletonTable rows={6} columns={5} />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-0">
                    <EmptyState
                      icon={BookOpen}
                      title="No blog posts found"
                      description='Click "New Post" to create one.'
                      className="border-0 rounded-none"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPosts.map((post) => (
                  <TableRow key={post._id} className="group/row">
                    <TableCell className="font-medium text-foreground py-4 max-w-0 w-full overflow-hidden">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-9 w-9 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="font-semibold text-sm sm:text-base leading-snug truncate">
                            {post.title}
                          </div>
                          {post.summary && (
                            <div className="text-xs text-muted-foreground truncate font-normal mt-0.5">
                              {post.summary.length > 60
                                ? `${post.summary.substring(0, 60)}...`
                                : post.summary}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground font-normal overflow-hidden">
                            <span className="bg-muted border border-border/40 px-1.5 py-0.5 rounded truncate shrink min-w-0">
                              /blog/{post.slug}
                            </span>
                            <span className="shrink-0">•</span>
                            <span className="shrink-0 whitespace-nowrap">
                              Created {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={post.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 opacity-30 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => router.push(`/blog/${post._id}`)}
                          icon={Edit3}
                        >
                          Edit
                        </Button>
                        <Button
                          size="icon"
                          variant="danger"
                          onClick={() => handleDeleteTrigger(post._id, post.title)}
                          icon={Trash2}
                          aria-label={`Delete post ${post.title}`}
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
              total: filteredPosts.length,
              totalPages,
            }}
            page={page}
            onPageChange={setPage}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            itemLabel="posts"
            className="px-2 pt-2"
          />
        </div>
      )}
    </div>
  );
}
