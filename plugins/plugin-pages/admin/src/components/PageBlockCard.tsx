"use client";

import { Badge, Button } from "@cms/admin-shell";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import { BentoGridBlockForm } from "../blocks/BentoGridBlockForm";
import { BlogPostsBlockForm } from "../blocks/BlogPostsBlockForm";
import { CodeShowcaseBlockForm } from "../blocks/CodeShowcaseBlockForm";
import { FormBlockForm } from "../blocks/FormBlockForm";
import { GalleryBlockForm } from "../blocks/GalleryBlockForm";
import { HeroBlockForm } from "../blocks/HeroBlockForm";
import { InteractiveDemoBlockForm } from "../blocks/InteractiveDemoBlockForm";
import { TextBlockForm } from "../blocks/TextBlockForm";
import { BLOCK_CATALOG, type PageBlock } from "./blockCatalog";

interface PageBlockCardProps {
  block: PageBlock;
  index: number;
  totalBlocks: number;
  isCollapsed: boolean;
  onToggleCollapse: (index: number) => void;
  onMoveBlock: (index: number, direction: "up" | "down") => void;
  onDuplicateBlock: (index: number) => void;
  onRemoveBlock: (index: number) => void;
  onUpdateBlock: (index: number, updated: PageBlock) => void;
}

function renderBlockForm(
  block: PageBlock,
  index: number,
  onUpdateBlock: (index: number, updated: PageBlock) => void,
) {
  switch (block.type) {
    case "hero":
      return (
        <HeroBlockForm
          data={block as unknown as Parameters<typeof HeroBlockForm>[0]["data"]}
          onChange={(updated) => onUpdateBlock(index, updated as unknown as PageBlock)}
        />
      );
    case "gallery":
      return (
        <GalleryBlockForm
          data={block as unknown as Parameters<typeof GalleryBlockForm>[0]["data"]}
          onChange={(updated) => onUpdateBlock(index, updated as unknown as PageBlock)}
        />
      );
    case "text":
      return (
        <TextBlockForm
          data={block as unknown as Parameters<typeof TextBlockForm>[0]["data"]}
          onChange={(updated) => onUpdateBlock(index, updated as unknown as PageBlock)}
        />
      );
    case "form":
      return (
        <FormBlockForm
          data={block as unknown as Parameters<typeof FormBlockForm>[0]["data"]}
          onChange={(updated) => onUpdateBlock(index, updated as unknown as PageBlock)}
        />
      );
    case "blog_posts":
      return (
        <BlogPostsBlockForm
          data={block as unknown as Parameters<typeof BlogPostsBlockForm>[0]["data"]}
          onChange={(updated) => onUpdateBlock(index, updated as unknown as PageBlock)}
        />
      );
    case "bento_grid":
      return (
        <BentoGridBlockForm
          data={block as unknown as Parameters<typeof BentoGridBlockForm>[0]["data"]}
          onChange={(updated) => onUpdateBlock(index, updated as unknown as PageBlock)}
        />
      );
    case "code_showcase":
      return (
        <CodeShowcaseBlockForm
          data={block as unknown as Parameters<typeof CodeShowcaseBlockForm>[0]["data"]}
          onChange={(updated) => onUpdateBlock(index, updated as unknown as PageBlock)}
        />
      );
    case "interactive_demo":
      return (
        <InteractiveDemoBlockForm
          data={block as unknown as Parameters<typeof InteractiveDemoBlockForm>[0]["data"]}
          onChange={(updated) => onUpdateBlock(index, updated as unknown as PageBlock)}
        />
      );
    default:
      return (
        <div className="text-xs text-muted-foreground p-3">
          Unknown block type: {(block as { type: string }).type}
        </div>
      );
  }
}

export function PageBlockCard({
  block,
  index,
  totalBlocks,
  isCollapsed,
  onToggleCollapse,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onUpdateBlock,
}: PageBlockCardProps) {
  const def = BLOCK_CATALOG.find((b) => b.type === block.type);
  const Icon = def ? def.icon : Plus;

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden transition-all">
      {/* Block Header */}
      <div className="flex items-center justify-between p-3.5 bg-muted/20 border-b border-border/60 gap-3">
        <div
          onClick={() => onToggleCollapse(index)}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none flex-1"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Icon className="size-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm text-foreground truncate">
              {def ? def.title : block.type}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono font-medium">
              #{index + 1}
            </Badge>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMoveBlock(index, "up")}
            disabled={index === 0}
            title="Move Up"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMoveBlock(index, "down")}
            disabled={index === totalBlocks - 1}
            title="Move Down"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onDuplicateBlock(index)}
            title="Duplicate Block"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Copy className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemoveBlock(index)}
            title="Delete Block"
            className="text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onToggleCollapse(index)}
            title={isCollapsed ? "Expand" : "Collapse"}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Block Content Form */}
      {!isCollapsed && <div className="p-5">{renderBlockForm(block, index, onUpdateBlock)}</div>}
    </div>
  );
}
