"use client";

import { Badge, Button, cn } from "@cms/admin-shell";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { BentoGridBlockForm } from "./blocks/BentoGridBlockForm";
import { BlogPostsBlockForm } from "./blocks/BlogPostsBlockForm";
import { CodeShowcaseBlockForm } from "./blocks/CodeShowcaseBlockForm";
import { FormBlockForm } from "./blocks/FormBlockForm";
import { GalleryBlockForm } from "./blocks/GalleryBlockForm";
import { HeroBlockForm } from "./blocks/HeroBlockForm";
import { InteractiveDemoBlockForm } from "./blocks/InteractiveDemoBlockForm";
import { TextBlockForm } from "./blocks/TextBlockForm";
import { BlockPickerModal } from "./components/BlockPickerModal";
import { BLOCK_CATALOG, type BlockDefinition, type PageBlock } from "./components/blockCatalog";

export { BLOCK_CATALOG } from "./components/blockCatalog";
export type { BlockDefinition, PageBlock, PageBlockType } from "./components/blockCatalog";

export interface PageBlockEditorProps {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
  className?: string;
}

export function PageBlockEditor({ blocks = [], onChange, className }: PageBlockEditorProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = React.useState<Record<number, boolean>>({});

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
          <div className="text-xs text-muted-foreground p-3">
            Unknown block type: {(block as { type: string }).type}
          </div>
        );
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Content Blocks ({blocks.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assemble dynamic layouts by stacking, reordering, and customizing visual blocks.
          </p>
        </div>

        <Button type="button" onClick={() => setPickerOpen(true)} iconStart={<Plus />}>
          Add Block
        </Button>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center space-y-3">
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Plus className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">No content blocks yet</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click &quot;Add Block&quot; to begin building your page layout.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            iconStart={<Plus />}
          >
            Add First Block
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((block, index) => {
            const def = BLOCK_CATALOG.find((b) => b.type === block.type);
            const Icon = def ? def.icon : Plus;
            const isCollapsed = Boolean(collapsedBlocks[index]);

            return (
              <div
                key={index}
                className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden transition-all"
              >
                {/* Block Header */}
                <div className="flex items-center justify-between p-3.5 bg-muted/20 border-b border-border/60 gap-3">
                  <div
                    onClick={() => toggleCollapse(index)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none flex-1"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm text-foreground truncate">
                        {def ? def.title : block.type}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono font-medium"
                      >
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
                      onClick={() => handleMoveBlock(index, "up")}
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
                      onClick={() => handleMoveBlock(index, "down")}
                      disabled={index === blocks.length - 1}
                      title="Move Down"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDuplicateBlock(index)}
                      title="Duplicate Block"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveBlock(index)}
                      title="Delete Block"
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleCollapse(index)}
                      title={isCollapsed ? "Expand" : "Collapse"}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronUp className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Block Content Form (Collapsed state) */}
                {!isCollapsed && <div className="p-5">{renderBlockForm(block, index)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Block Picker Modal */}
      <BlockPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelectBlock={handleAddBlock}
      />
    </div>
  );
}
