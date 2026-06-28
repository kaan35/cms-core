"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { ArrowLeft, Save } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BlogEditPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const postId = params.id as string;

  const [formData, setFormData] = useState({
    content: "",
    slug: "",
    status: "published" as "draft" | "published",
    summary: "",
    title: "",
  });

  const { data, error, isLoading } = useApiQuery<any>(`/blog/${postId}`);

  const { trigger: updatePost, isMutating } = useApiMutation({
    path: `/blog/${postId}`,
    method: "PUT",
    onSuccess: () => {
      showToast({ message: "Blog post updated successfully", type: "success" });
      router.push("/blog");
      router.refresh();
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to update blog post", type: "error" });
    },
  });

  useEffect(() => {
    if (data?.post) {
      const post = data.post;
      setFormData({
        title: post.title,
        slug: post.slug,
        summary: post.summary || "",
        content: post.content || "",
        status: post.status || "published",
      });
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      if (error instanceof ApiError && error.status === 404) {
        showToast({ message: "Blog post not found", type: "error" });
      } else if (error instanceof ApiError && error.status === 400) {
        showToast({ message: error.message || "Invalid blog post ID", type: "error" });
      } else {
        showToast({ message: "Failed to load blog post", type: "error" });
      }
      router.push("/blog");
    }
  }, [error, router, showToast]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "title") {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");
      }
      return updated;
    });
  };

  const savePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      showToast({ message: "Title is required", type: "warning" });
      return;
    }
    if (!formData.slug) {
      showToast({ message: "Slug is required", type: "warning" });
      return;
    }

    await updatePost(formData);
  };

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Post</h1>
          <p className="text-sm text-zinc-400">Update article content and publishing settings</p>
        </div>
      </div>

      <form onSubmit={savePost} className="space-y-6">
        <Card
          title="Article Metadata & Body"
          description="Manage core text content, publishing variables and slug pathing"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                label="Post Title"
                placeholder="e.g. Getting Started with Docker"
              />

              <Input
                type="text"
                required
                value={formData.slug}
                onChange={(e) =>
                  handleChange("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))
                }
                label="Post Slug (URL Path)"
                placeholder="e.g. getting-started-with-docker"
              />
            </div>

            <Input
              type="text"
              required
              value={formData.summary}
              onChange={(e) => handleChange("summary", e.target.value)}
              label="Short Summary"
              placeholder="A brief subtitle or meta description for search results"
            />

            <Textarea
              required
              rows={12}
              value={formData.content}
              onChange={(e) => handleChange("content", e.target.value)}
              label="Content (Markdown / Text)"
              placeholder="Write your article body content here..."
              className="font-mono"
            />

            <div className="w-full sm:w-1/3">
              <Select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value as any)}
                label="Publishing Status"
              >
                <option value="published">Published (Visible to all)</option>
                <option value="draft">Draft (Private draft)</option>
              </Select>
            </div>
          </div>
        </Card>

        <div className="flex gap-4 border-t border-white/5 pt-6">
          <Button type="submit" isLoading={isMutating} icon={Save}>
            Save Changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/blog")}
            icon={ArrowLeft}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
