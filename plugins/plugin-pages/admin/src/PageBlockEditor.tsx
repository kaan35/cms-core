"use client";

import { Button, cn } from "@cms/admin-shell";
import { Plus } from "lucide-react";
import * as React from "react";
import { BlockPickerModal } from "./components/BlockPickerModal";
import { type BlockDefinition, type PageBlock } from "./components/blockCatalog";
import { PageBlockCard } from "./components/PageBlockCard";

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
          {blocks.map((block, index) => (
            <PageBlockCard
              key={index}
              block={block}
              index={index}
              totalBlocks={blocks.length}
              isCollapsed={Boolean(collapsedBlocks[index])}
              onToggleCollapse={toggleCollapse}
              onMoveBlock={handleMoveBlock}
              onDuplicateBlock={handleDuplicateBlock}
              onRemoveBlock={handleRemoveBlock}
              onUpdateBlock={handleUpdateBlock}
            />
          ))}
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
