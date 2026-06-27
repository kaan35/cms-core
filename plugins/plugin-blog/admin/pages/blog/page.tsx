"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Loading } from "@/components/ui/Loading";
import { TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/Table";
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

  // Fetch blog posts
  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery<{ posts: BlogPost[] }>(
    "/blog",
  );
  const posts = data?.posts || [];

  // Delete mutation
  const { trigger: deletePost } = useApiMutation({
    path: `/blog/${targetPost?.id}`,
    method: "DELETE",
    onSuccess: () => {
      refetch();
      showToast({ message: "Blog post deleted successfully", type: "success" });
      setTargetPost(null);
      setIsConfirmOpen(false);
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

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Blog Post"
        message={`Are you sure you want to permanently delete the blog post "${targetPost?.title}"?`}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsConfirmOpen(false);
          setTargetPost(null);
        }}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog Posts</h1>
          <p className="text-sm text-zinc-400">Create, publish, and manage website articles</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => refetch()} isDisabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="primary" onClick={() => router.push("/blog/new")} icon={Plus}>
            New Post
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message || "Failed to load blog posts"}
        </div>
      )}

      <div className="border border-white/5 rounded-xl bg-zinc-900/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="w-2/5">
                  Title
                </TableCell>
                <TableCell isHeader className="w-1/5">
                  Slug
                </TableCell>
                <TableCell isHeader className="w-[100px]">
                  Status
                </TableCell>
                <TableCell isHeader className="w-[120px]">
                  Date
                </TableCell>
                <TableCell isHeader className="w-[180px] text-right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                    <BookOpen className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                    No blog posts found. Click "New Post" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post._id}>
                    <TableCell className="font-medium text-white">
                      <div className="max-w-full">
                        <div className="truncate">{post.title}</div>
                        <div className="text-xs text-zinc-400 truncate font-normal mt-0.5">
                          {post.summary.length > 60 ? `${post.summary.substring(0, 60)}...` : post.summary}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-zinc-400">
                      <div className="truncate">/blog/{post.slug}</div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wider whitespace-nowrap ${
                          post.status === "published"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {post.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
      </div>
    </div>
  );
}
