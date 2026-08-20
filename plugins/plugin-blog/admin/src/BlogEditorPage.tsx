"use client";

import { apiClient, Button, Skeleton, toast, useApi } from "@cms/admin-shell";
import { ArrowLeft, Clock, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { BlogPostEditor, type BlogPostFormData } from "./BlogPostEditor";
import { BlogPostVersionHistory, type BlogPostDoc } from "./BlogPostVersionHistory";

export function BlogEditorPage({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === "new";

  const {
    data: fetchedPost,
    isLoading,
    mutate,
  } = useApi<BlogPostDoc>(isNew ? null : `/api/blog/${id}`);
  const [restoredSnapshot, setRestoredSnapshot] = React.useState<BlogPostDoc | null>(null);
  const post = restoredSnapshot || fetchedPost || null;

  const [formState, setFormState] = React.useState({
    isSubmitting: false,
  });
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

  const handleSave = async (data: BlogPostFormData) => {
    if (!data.title) {
      toast.error("Post title is required");
      return;
    }
    if (!data.summary) {
      toast.error("Post summary is required");
      return;
    }
    if (!data.content) {
      toast.error("Post content is required");
      return;
    }

    setFormState({ isSubmitting: true });
    try {
      if (isNew) {
        const created = await apiClient<BlogPostDoc>("/api/blog", {
          method: "POST",
          body: data,
        });
        toast.success("Blog post created successfully");
        router.push(`/dashboard/blog/${created.id}`);
      } else {
        const updated = await apiClient<BlogPostDoc>(`/api/blog/${id}`, {
          method: "PUT",
          body: data,
        });
        toast.success("Blog post updated successfully");
        setRestoredSnapshot(null);
        mutate(updated, false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save blog post");
    } finally {
      setFormState({ isSubmitting: false });
    }
  };

  const handleRestoreSnapshot = (snapshot: BlogPostDoc) => {
    setRestoredSnapshot(snapshot);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/blog">
            <Button variant="ghost" size="icon-sm" className="rounded-xl">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {isNew ? "New Article" : post?.title || "Edit Article"}
              </h1>
              {!isNew && post?.version && (
                <span className="text-[11px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border">
                  v{post.version}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isNew
                ? "Write and publish a new blog post"
                : `URL Slug: /blog/${post?.slug || "..."}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              <Clock className="size-3.5" />
              History
            </Button>
          )}

          <Button
            type="submit"
            form="blog-post-form"
            size="sm"
            loading={formState.isSubmitting}
            iconStart={<Save className="size-3.5" />}
            className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
          >
            {formState.isSubmitting ? "Saving..." : isNew ? "Publish Article" : "Save Changes"}
          </Button>
        </div>
      </div>

      <BlogPostEditor initialData={post || undefined} onSave={handleSave} />

      {!isNew && (
        <BlogPostVersionHistory
          postId={id}
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          onRestore={handleRestoreSnapshot}
        />
      )}
    </div>
  );
}
