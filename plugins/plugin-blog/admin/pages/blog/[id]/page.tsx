"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Loading } from "@/components/ui/Loading";
import { ApiError, apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useApiMutation } from "@/hooks/useApi";
import { ArrowLeft, Save } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BlogEditPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const postId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    content: "",
    slug: "",
    status: "published" as "draft" | "published",
    summary: "",
    title: "",
  });

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
    const fetchPost = async () => {
      try {
        console.log("Fetching blog post with ID:", postId);
        const data = await apiFetch(`/blog/${postId}`);
        console.log("Blog post data received:", data);
        const post = data.post;
        setFormData({
          title: post.title,
          slug: post.slug,
          summary: post.summary || "",
          content: post.content || "",
          status: post.status || "published",
        });
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error fetching blog post:", err);
        if (err instanceof ApiError && err.status === 404) {
          showToast({ message: "Blog post not found", type: "error" });
        } else if (err instanceof ApiError && err.status === 400) {
          showToast({ message: err.message || "Invalid blog post ID", type: "error" });
        } else {
          showToast({ message: "Failed to load blog post", type: "error" });
          console.error("Failed to load blog post:", err);
        }
        // Redirect after showing error
        router.push("/blog");
      }
    };

    fetchPost();
  }, [postId, router, showToast]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
          <h1 className="text-2xl font-bold tracking-tight">Edit Post: {formData.title}</h1>
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
