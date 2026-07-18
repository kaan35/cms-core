"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  FormInput,
  Layout,
  Library,
  Plus,
  Save,
  Type,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Block {
  id: string;
  type: "hero" | "text" | "form" | "blog_posts";
  title?: string;
  subtitle?: string;
  content?: string;
  formId?: string;
  count?: number;
}

interface PageFormProps {
  mode: "create" | "update";
  pageId?: string;
  initialData?: {
    title: string;
    slug: string;
    status: "draft" | "published";
    blocks: Block[];
  };
}

export function PageForm({ mode, pageId, initialData }: PageFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: formsData } = useApiQuery<{
    forms: Array<{ formId: string; name: string }>;
  }>("/forms");
  const forms = formsData?.forms || [];

  const [formData, setFormData] = useState({
    blocks: initialData?.blocks || [],
    slug: initialData?.slug || "",
    status: initialData?.status || ("draft" as "draft" | "published"),
    title: initialData?.title || "",
  });

  const { trigger: savePage, isMutating } = useApiMutation({
    method: mode === "create" ? "POST" : "PUT",
    onError: (err: Error) => {
      showToast({
        message: err.message || "Failed to save page",
        type: "error",
      });
    },
    onSuccess: () => {
      showToast({
        message: `Page ${mode === "create" ? "created" : "updated"} successfully`,
        type: "success",
      });
      router.push("/pages");
      router.refresh();
    },
    path: mode === "create" ? "/pages" : `/pages/${pageId}`,
  });

  const handleChange = (field: "title" | "slug", value: string) => {
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

  const addBlock = (type: Block["type"]) => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type,
    };

    if (type === "hero") {
      newBlock.title = "Hero Title";
      newBlock.subtitle = "Hero Subtitle goes here.";
    } else if (type === "text") {
      newBlock.content = "Enter body content here.";
    } else if (type === "form") {
      newBlock.formId = forms[0]?.formId || "contact-form";
    } else if (type === "blog_posts") {
      newBlock.count = 5;
    }

    setFormData((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
  };

  const updateBlockField = (
    index: number,
    field: keyof Block,
    value: Block[keyof Block],
  ) => {
    setFormData((prev) => {
      const updatedBlocks = [...prev.blocks];
      updatedBlocks[index] = {
        ...updatedBlocks[index],
        [field]: value,
      };
      return { ...prev, blocks: updatedBlocks };
    });
  };

  const removeBlock = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index),
    }));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === formData.blocks.length - 1) return;

    setFormData((prev) => {
      const newBlocks = [...prev.blocks];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[targetIndex];
      newBlocks[targetIndex] = temp;
      return { ...prev, blocks: newBlocks };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug) {
      showToast({ message: "Slug is required", type: "warning" });
      return;
    }

    await savePage(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card
        title="Page Definition Properties"
        description="Configure page meta values and friendly URL"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              label="Page Title"
              placeholder="e.g. Home Page"
            />
            <Input
              type="text"
              required
              value={formData.slug}
              onChange={(e) =>
                handleChange(
                  "slug",
                  e.target.value.toLowerCase().replace(/\s+/g, "-"),
                )
              }
              label="Page Slug"
              placeholder="e.g. home"
            />
          </div>

          <div className="w-full md:w-1/3">
            <Select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  status: e.target.value as "draft" | "published",
                }))
              }
              label="Publishing Status"
            >
              <option value="published">Published (Visible to all)</option>
              <option value="draft">Draft (Private draft)</option>
            </Select>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">
            Blocks Layout
          </h3>
          <span className="text-xs text-muted-foreground">
            {formData.blocks.length} blocks total
          </span>
        </div>

        {formData.blocks.length === 0 ? (
          <EmptyState
            icon={Layout}
            title="No blocks added yet"
            description="Choose a block type below to begin layout."
          />
        ) : (
          <div className="space-y-4">
            {formData.blocks.map((block, index) => {
              return (
                <div
                  key={block.id}
                  className="group relative rounded-xl border border-border bg-card p-5 shadow-sm flex gap-4 items-start"
                >
                  <div className="flex flex-col gap-1 mt-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => moveBlock(index, "up")}
                      isDisabled={index === 0}
                      aria-label="Move block up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => moveBlock(index, "down")}
                      isDisabled={index === formData.blocks.length - 1}
                      aria-label="Move block down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="capitalize text-xs font-bold px-2 py-0.5 rounded bg-primary/15 text-primary tracking-wider">
                        {block.type} Block
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ID: {block.id}
                      </span>
                    </div>

                    {block.type === "hero" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          value={block.title || ""}
                          onChange={(e) =>
                            updateBlockField(index, "title", e.target.value)
                          }
                          label="Hero Title"
                        />
                        <Input
                          value={block.subtitle || ""}
                          onChange={(e) =>
                            updateBlockField(index, "subtitle", e.target.value)
                          }
                          label="Hero Subtitle"
                        />
                      </div>
                    )}

                    {block.type === "text" && (
                      <Textarea
                        rows={3}
                        value={block.content || ""}
                        onChange={(e) =>
                          updateBlockField(index, "content", e.target.value)
                        }
                        label="Text Content"
                      />
                    )}

                    {block.type === "form" && (
                      <Select
                        value={block.formId || ""}
                        onChange={(e) =>
                          updateBlockField(index, "formId", e.target.value)
                        }
                        label="Select Form"
                      >
                        {forms.map((form) => (
                          <option key={form.formId} value={form.formId}>
                            {form.name} ({form.formId})
                          </option>
                        ))}
                      </Select>
                    )}

                    {block.type === "blog_posts" && (
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={block.count || 5}
                        onChange={(e) =>
                          updateBlockField(
                            index,
                            "count",
                            parseInt(e.target.value) || 5,
                          )
                        }
                        label="Display Limit"
                        className="w-24"
                      />
                    )}
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeBlock(index)}
                    aria-label="Remove block"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Card
        title="Block Injector"
        description="Choose block sections to build and append modular page structures"
      >
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addBlock("hero")}
            icon={Layout}
          >
            Hero Block
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addBlock("text")}
            icon={Type}
          >
            Text Block
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addBlock("form")}
            icon={FormInput}
          >
            Form Block
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addBlock("blog_posts")}
            icon={Library}
          >
            Blog Posts Block
          </Button>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 bg-background/95 backdrop-blur-sm border-t border-border flex items-center gap-4">
        <Button
          type="submit"
          isLoading={isMutating}
          icon={mode === "create" ? Plus : Save}
        >
          {mode === "create" ? "Create Page" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/pages")}
          icon={ArrowLeft}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
