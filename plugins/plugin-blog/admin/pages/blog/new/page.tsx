"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useApiMutation } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BlogNewPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    summary: "",
    content: "",
    status: "published" as "draft" | "published",
  });

  const { trigger: createPost, isMutating } = useApiMutation({
    path: "/blog",
    method: "POST",
    onSuccess: () => {
      showToast({ message: "Blog post created successfully", type: "success" });
      router.push("/blog");
      router.refresh();
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to create blog post", type: "error" });
    },
  });

  const handleTitleChange = (val: string) => {
    setFormData((prev) => ({ ...prev, title: val }));
    // Auto-generate slug
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setFormData((prev) => ({ ...prev, slug: generated }));
  };

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

    await createPost(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Blog Post</h1>
          <p className="text-sm text-zinc-400">
            Compose and publish articles with content summary and tag status
          </p>
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
                onChange={(e) => handleTitleChange(e.target.value)}
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

        {/* Actions */}
        <div className="border-t border-white/5 pt-6 flex items-center gap-4">
          <Button type="submit" isLoading={isMutating} icon={Save}>
            Create Post
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
