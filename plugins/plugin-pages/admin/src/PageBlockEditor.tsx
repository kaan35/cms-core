"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  cn,
} from "@cms/admin-shell";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Code2,
  Copy,
  FileText,
  Images,
  LayoutGrid,
  LayoutTemplate,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { BentoGridBlockForm } from "./blocks/BentoGridBlockForm";
import { BlogPostsBlockForm } from "./blocks/BlogPostsBlockForm";
import { CodeShowcaseBlockForm } from "./blocks/CodeShowcaseBlockForm";
import { FormBlockForm } from "./blocks/FormBlockForm";
import { GalleryBlockForm } from "./blocks/GalleryBlockForm";
import { HeroBlockForm } from "./blocks/HeroBlockForm";
import { InteractiveDemoBlockForm } from "./blocks/InteractiveDemoBlockForm";
import { TextBlockForm } from "./blocks/TextBlockForm";

export type PageBlockType =
  | "hero"
  | "gallery"
  | "text"
  | "form"
  | "blog_posts"
  | "bento_grid"
  | "code_showcase"
  | "interactive_demo";

export interface PageBlock {
  type: PageBlockType;
  [key: string]: unknown;
}

export interface PageBlockEditorProps {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
  className?: string;
}

interface BlockDefinition {
  type: PageBlockType;
  title: string;
  category: "Marketing" | "Media" | "Content" | "Forms" | "Feed";
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultData: () => PageBlock;
}

const BLOCK_CATALOG: BlockDefinition[] = [
  {
    type: "hero",
    title: "Hero Section",
    category: "Marketing",
    description: "High-impact opening banner with headline, subtitle, media background, and CTAs.",
    icon: LayoutTemplate,
    defaultData: () => ({
      type: "hero",
      title: "Elevate Your Digital Experience",
      subtitle: "Powerful solutions built for modern businesses.",
      primaryCta: { label: "Get Started", url: "/contact" },
      secondaryCta: { label: "Learn More", url: "/about" },
    }),
  },
  {
    type: "gallery",
    title: "Image Gallery",
    category: "Media",
    description: "Responsive image grid or masonry flow linked to your media library assets.",
    icon: Images,
    defaultData: () => ({
      type: "gallery",
      title: "Our Portfolio",
      layout: "grid",
      images: [],
    }),
  },
  {
    type: "text",
    title: "Rich Text & Articles",
    category: "Content",
    description: "Structured markdown, headers, lists, links, and formatted paragraph blocks.",
    icon: FileText,
    defaultData: () => ({
      type: "text",
      content:
        "## Section Title\n\nEnter your narrative text here with **bold** or *italic* styling.",
    }),
  },
  {
    type: "form",
    title: "Interactive Form",
    category: "Forms",
    description: "Embed dynamic forms with validation, challenge captcha, and submission tracking.",
    icon: ClipboardList,
    defaultData: () => ({
      type: "form",
      formId: "",
    }),
  },
  {
    type: "blog_posts",
    title: "Blog Posts Feed",
    category: "Feed",
    description: "Dynamic feed displaying recent published articles and insights.",
    icon: BookOpen,
    defaultData: () => ({
      type: "blog_posts",
      limit: 6,
      layout: "grid",
    }),
  },
  {
    type: "bento_grid",
    title: "Bento Feature Grid",
    category: "Marketing",
    description: "Modern asymmetric cards highlighting core product features and badges.",
    icon: LayoutGrid,
    defaultData: () => ({
      type: "bento_grid",
      cards: [
        {
          title: "Blazing Fast",
          description: "Built on modern edge infrastructure.",
          badge: "Speed",
        },
        {
          title: "Secure & Resilient",
          description: "Enterprise-grade RBAC and auth.",
          badge: "Security",
        },
      ],
    }),
  },
  {
    type: "code_showcase",
    title: "Code Showcase",
    category: "Content",
    description: "Syntax-highlighted code viewer with multiple language tabs.",
    icon: Code2,
    defaultData: () => ({
      type: "code_showcase",
      tabs: [
        { label: "Bash", language: "bash", code: "curl -X GET https://api.example.com/pages" },
      ],
    }),
  },
  {
    type: "interactive_demo",
    title: "Interactive Demo",
    category: "Content",
    description: "Live embedded interactive preview widget or verification demo.",
    icon: Sparkles,
    defaultData: () => ({
      type: "interactive_demo",
      widgetType: "turnstile",
      title: "Security Verification",
      description: "Interactive challenge demo widget.",
    }),
  },
];

export function PageBlockEditor({ blocks = [], onChange, className }: PageBlockEditorProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [collapsedBlocks, setCollapsedBlocks] = React.useState<Record<number, boolean>>({});

  const categories = ["All", "Marketing", "Media", "Content", "Forms", "Feed"];

  const filteredCatalog = React.useMemo(() => {
    return BLOCK_CATALOG.filter((item) => {
      const matchCat = selectedCategory === "All" || item.category === selectedCategory;
      const matchQuery =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [search, selectedCategory]);

  const handleAddBlock = (def: BlockDefinition) => {
    const newBlock = def.defaultData();
    onChange([...blocks, newBlock]);
    setPickerOpen(false);
  };

  const handleUpdateBlock = (index: number, updatedData: PageBlock) => {
    const next = [...blocks];
    next[index] = updatedData;
    onChange(next);
  };

  const handleRemoveBlock = (index: number) => {
    const next = blocks.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleDuplicateBlock = (index: number) => {
    const target = JSON.parse(JSON.stringify(blocks[index]));
    const next = [...blocks];
    next.splice(index + 1, 0, target);
    onChange(next);
  };

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const item = blocks[index];
    const targetItem = blocks[targetIndex];
    if (!item || !targetItem) return;
    const next = [...blocks];
    next[index] = targetItem;
    next[targetIndex] = item;
    onChange(next);
  };

  const toggleCollapse = (index: number) => {
    setCollapsedBlocks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const renderBlockForm = (block: PageBlock, index: number) => {
    switch (block.type) {
      case "hero":
        return (
          <HeroBlockForm
            data={block as unknown as Parameters<typeof HeroBlockForm>[0]["data"]}
            onChange={(updated) => handleUpdateBlock(index, updated as unknown as PageBlock)}
          />
        );
      case "gallery":
        return (
          <GalleryBlockForm
            data={block as unknown as Parameters<typeof GalleryBlockForm>[0]["data"]}
            onChange={(updated) => handleUpdateBlock(index, updated as unknown as PageBlock)}
          />
        );
      case "text":
        return (
          <TextBlockForm
            data={block as unknown as Parameters<typeof TextBlockForm>[0]["data"]}
            onChange={(updated) => handleUpdateBlock(index, updated as unknown as PageBlock)}
          />
        );
      case "form":
        return (
          <FormBlockForm
            data={block as unknown as Parameters<typeof FormBlockForm>[0]["data"]}
            onChange={(updated) => handleUpdateBlock(index, updated as unknown as PageBlock)}
          />
        );
      case "blog_posts":
        return (
          <BlogPostsBlockForm
            data={block as unknown as Parameters<typeof BlogPostsBlockForm>[0]["data"]}
            onChange={(updated) => handleUpdateBlock(index, updated as unknown as PageBlock)}
          />
        );
      case "bento_grid":
        return (
          <BentoGridBlockForm
            data={block as unknown as Parameters<typeof BentoGridBlockForm>[0]["data"]}
            onChange={(updated) => handleUpdateBlock(index, updated as unknown as PageBlock)}
          />
        );
      case "code_showcase":
        return (
          <CodeShowcaseBlockForm
            data={block as unknown as Parameters<typeof CodeShowcaseBlockForm>[0]["data"]}
            onChange={(updated) => handleUpdateBlock(index, updated as unknown as PageBlock)}
          />
        );
      case "interactive_demo":
        return (
          <InteractiveDemoBlockForm
            data={block as unknown as Parameters<typeof InteractiveDemoBlockForm>[0]["data"]}
            onChange={(updated) => handleUpdateBlock(index, updated as unknown as PageBlock)}
          />
        );
      default:
        return (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Custom JSON payload for {block.type}:</p>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-border/80 bg-muted/20 p-2 font-mono text-xs"
              value={JSON.stringify(block, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleUpdateBlock(index, parsed);
                } catch {
                  // Wait for valid JSON
                }
              }}
            />
          </div>
        );
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Page Blocks ({blocks.length})</h3>
          <p className="text-xs text-muted-foreground">
            Compose and arrange structured layout sections for this page.
          </p>
        </div>

        <Button type="button" onClick={() => setPickerOpen(true)} iconStart={<Plus />}>
          Add Block
        </Button>
      </div>

      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <LayoutTemplate className="size-6" />
          </div>
          <h4 className="font-semibold text-base text-foreground">No Blocks Added Yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Add your first block (Hero, Image Gallery, Rich Text, Form, or Blog Feed) to start
            building the page layout.
          </p>
          <Button
            type="button"
            onClick={() => setPickerOpen(true)}
            iconStart={<Plus />}
            className="mt-4"
          >
            Open Block Gallery
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((block, index) => {
            const def = BLOCK_CATALOG.find((b) => b.type === block.type);
            const Icon = def?.icon || LayoutTemplate;
            const isCollapsed = collapsedBlocks[index];

            return (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs transition-all"
              >
                {/* Block Header Toolbar */}
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-foreground">
                          {def?.title || block.type}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 uppercase">
                          {block.type}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === 0}
                      onClick={() => handleMoveBlock(index, "up")}
                      iconStart={<ArrowUp />}
                      title="Move Up"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === blocks.length - 1}
                      onClick={() => handleMoveBlock(index, "down")}
                      iconStart={<ArrowDown />}
                      title="Move Down"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDuplicateBlock(index)}
                      iconStart={<Copy />}
                      title="Duplicate Block"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleRemoveBlock(index)}
                      iconStart={<Trash2 />}
                      title="Remove Block"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleCollapse(index)}
                      iconStart={isCollapsed ? <ChevronDown /> : <ChevronUp />}
                      title={isCollapsed ? "Expand" : "Collapse"}
                    />
                  </div>
                </div>

                {/* Block Body Content */}
                {!isCollapsed && <div className="p-5">{renderBlockForm(block, index)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Block Gallery Modal */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-3xl max-w-3xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle>Block Gallery & Component Picker</DialogTitle>
            <DialogDescription className="text-xs">
              Select a pre-designed layout component to add to your page canvas.
            </DialogDescription>
          </DialogHeader>

          {/* Search & Categories Bar */}
          <div className="space-y-3 py-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search blocks (Hero, Gallery, Form, Feed...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Block Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredCatalog.map((def) => {
                const Icon = def.icon;
                return (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => handleAddBlock(def)}
                    className="group relative flex flex-col items-start rounded-xl border border-border/80 bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                  >
                    <div className="flex w-full items-center justify-between mb-2">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                        <Icon className="size-4" />
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {def.category}
                      </Badge>
                    </div>

                    <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {def.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {def.description}
                    </p>

                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="size-3.5" />
                      Insert Block
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
