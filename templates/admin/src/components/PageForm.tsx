"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    blocks: Block[];
  };
}

export function PageForm({ mode, pageId, initialData }: PageFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: formsData } = useApiQuery<{ forms: Array<{ formId: string; name: string }> }>(
    "/forms",
  );
  const forms = formsData?.forms || [];

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    blocks: initialData?.blocks || [],
  });

  const { trigger: savePage, isMutating } = useApiMutation({
    path: mode === "create" ? "/pages" : `/pages/${pageId}`,
    method: mode === "create" ? "POST" : "PUT",
    onSuccess: () => {
      showToast({
        message: `Page ${mode === "create" ? "created" : "updated"} successfully`,
        type: "success",
      });
      router.push("/pages");
      router.refresh();
    },
    onError: (err: Error) => {
      showToast({ message: err.message || "Failed to save page", type: "error" });
    },
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

  const updateBlockField = (index: number, field: keyof Block, value: Block[keyof Block]) => {
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
        description="Configure page meta values and friendly URL pathing"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              handleChange("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            label="Page Slug"
            placeholder="e.g. home"
          />
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Blocks Layout</h3>
          <span className="text-xs text-zinc-500">{formData.blocks.length} blocks total</span>
        </div>

        {formData.blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-white/10 bg-zinc-900/10">
            <Layout className="h-10 w-10 text-zinc-600 mb-2" />
            <p className="text-zinc-500 text-sm">
              No blocks added yet. Choose a block type below to begin layout.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.blocks.map((block, index) => {
              return (
                <div
                  key={block.id}
                  className="group relative rounded-xl border border-white/5 bg-zinc-900/60 p-5 shadow-lg backdrop-blur-sm flex gap-4 items-start"
                >
                  <div className="flex flex-col gap-1 mt-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => moveBlock(index, "up")}
                      isDisabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => moveBlock(index, "down")}
                      isDisabled={index === formData.blocks.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="capitalize text-xs font-bold px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 tracking-wider">
                        {block.type} Block
                      </span>
                      <span className="text-xs text-zinc-500">ID: {block.id}</span>
                    </div>

                    {block.type === "hero" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          value={block.title || ""}
                          onChange={(e) => updateBlockField(index, "title", e.target.value)}
                          label="Hero Title"
                        />
                        <Input
                          value={block.subtitle || ""}
                          onChange={(e) => updateBlockField(index, "subtitle", e.target.value)}
                          label="Hero Subtitle"
                        />
                      </div>
                    )}

                    {block.type === "text" && (
                      <Textarea
                        rows={3}
                        value={block.content || ""}
                        onChange={(e) => updateBlockField(index, "content", e.target.value)}
                        label="Text Content"
                      />
                    )}

                    {block.type === "form" && (
                      <Select
                        value={block.formId || ""}
                        onChange={(e) => updateBlockField(index, "formId", e.target.value)}
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
                          updateBlockField(index, "count", parseInt(e.target.value) || 5)
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

      <div className="border-t border-white/5 pt-6 flex items-center gap-4">
        <Button type="submit" isLoading={isMutating} icon={mode === "create" ? Plus : Save}>
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
