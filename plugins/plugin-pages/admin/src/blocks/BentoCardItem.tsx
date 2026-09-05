"use client";

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@cms/admin-shell";
import { ArrowDown, ArrowUp, Columns, Tag, Trash2 } from "lucide-react";
import type { BentoCardData } from "./BentoGridBlockForm";

interface BentoCardItemProps {
  card: BentoCardData;
  index: number;
  totalCards: number;
  onUpdate: (patch: Partial<BentoCardData>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}

export function BentoCardItem({
  card,
  index,
  totalCards,
  onUpdate,
  onRemove,
  onMove,
}: BentoCardItemProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3 transition-all">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove("up")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
              title="Move Up"
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={index === totalCards - 1}
              onClick={() => onMove("down")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
              title="Move Down"
            >
              <ArrowDown className="size-3.5" />
            </button>
          </div>
          <span className="text-xs font-mono text-muted-foreground font-semibold">
            Card #{index + 1}
          </span>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          title="Delete Card"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 space-y-1">
          <Label className="text-[11px] text-muted-foreground">Card Title *</Label>
          <Input
            placeholder="e.g. Blazing Fast"
            value={card.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="h-8 text-xs font-semibold"
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Tag className="size-3" />
            <span>Badge (Optional)</span>
          </Label>
          <Input
            placeholder="e.g. Speed, Pro"
            value={card.badge || ""}
            onChange={(e) => onUpdate({ badge: e.target.value || undefined })}
            className="h-8 text-xs font-mono"
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Columns className="size-3" />
            <span>Column Span</span>
          </Label>
          <Select
            value={
              card.size === "large" || card.size === "2"
                ? "2"
                : card.size === "full" || card.size === "3"
                  ? "3"
                  : "1"
            }
            onValueChange={(val) => {
              if (val) onUpdate({ size: val as "1" | "2" | "3" });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Col (Standard)</SelectItem>
              <SelectItem value="2">2 Cols (Wide)</SelectItem>
              <SelectItem value="3">3 Cols (Full Width)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Description *</Label>
        <Textarea
          rows={2}
          placeholder="Describe the card capability..."
          value={card.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="text-xs"
        />
      </div>
    </div>
  );
}
