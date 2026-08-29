"use client";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@cms/admin-shell";
import { ArrowDown, ArrowUp, Columns, Plus, Sparkles, Tag, Trash2, Zap } from "lucide-react";

export interface BentoCardData {
  title: string;
  description: string;
  badge?: string | undefined;
  icon?: string | undefined;
  size?: "1" | "2" | "3" | "small" | "medium" | "large" | "full" | undefined;
}

export interface BentoGridBlockData {
  type: "bento_grid";
  title?: string | undefined;
  subtitle?: string | undefined;
  columns?: "2" | "3" | "4" | undefined;
  cards: BentoCardData[];
}

export interface BentoGridBlockFormProps {
  data: BentoGridBlockData;
  onChange: (data: BentoGridBlockData) => void;
}

export function BentoGridBlockForm({ data, onChange }: BentoGridBlockFormProps) {
  const cards = Array.isArray(data.cards) ? data.cards : [];

  const handleAddCard = () => {
    const newCard: BentoCardData = {
      title: "New Feature Card",
      description: "Describe the key benefit or capability of your product.",
      badge: "Feature",
      size: "1",
    };
    onChange({
      ...data,
      cards: [...cards, newCard],
    });
  };

  const handleUpdateCard = (index: number, patch: Partial<BentoCardData>) => {
    const updated = cards.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ ...data, cards: updated });
  };

  const handleRemoveCard = (index: number) => {
    onChange({ ...data, cards: cards.filter((_, i) => i !== index) });
  };

  const handleMoveCard = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;
    const updated = [...cards];
    const temp = updated[index];
    const target = updated[targetIndex];
    if (temp && target) {
      updated[index] = target;
      updated[targetIndex] = temp;
      onChange({ ...data, cards: updated });
    }
  };

  return (
    <div className="space-y-5">
      {/* Section Header & Grid Settings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pb-3 border-b border-border/60">
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="bento-title" className="text-xs font-semibold">
            Section Headline (Optional)
          </Label>
          <Input
            id="bento-title"
            placeholder="e.g. Everything you need to scale"
            value={data.title || ""}
            onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="bento-subtitle" className="text-xs font-semibold">
            Section Subtitle (Optional)
          </Label>
          <Input
            id="bento-subtitle"
            placeholder="e.g. Modern developer experience out of the box."
            value={data.subtitle || ""}
            onChange={(e) => onChange({ ...data, subtitle: e.target.value || undefined })}
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="bento-columns" className="text-xs font-semibold flex items-center gap-1">
            <Columns className="size-3 text-muted-foreground" />
            <span>Desktop Columns</span>
          </Label>
          <Select
            value={data.columns || "3"}
            onValueChange={(val) => {
              if (val) onChange({ ...data, columns: val as "2" | "3" | "4" });
            }}
          >
            <SelectTrigger id="bento-columns" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Columns (Half / Half)</SelectItem>
              <SelectItem value="3">3 Columns (Default 1/3)</SelectItem>
              <SelectItem value="4">4 Columns (Compact 1/4)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards List Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Bento Grid Cards ({cards.length})
          </span>
        </div>
        <Button type="button" variant="outline" onClick={handleAddCard} iconStart={<Plus />}>
          Add Feature Card
        </Button>
      </div>

      {/* Cards List */}
      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-6 text-center space-y-2">
          <Sparkles className="size-5 text-muted-foreground mx-auto opacity-50" />
          <p className="text-xs text-muted-foreground">No feature cards added yet.</p>
          <Button type="button" variant="outline" onClick={handleAddCard} iconStart={<Plus />}>
            Add First Card
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3 transition-all"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveCard(index, "up")}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === cards.length - 1}
                      onClick={() => handleMoveCard(index, "down")}
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
                  onClick={() => handleRemoveCard(index)}
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
                    onChange={(e) => handleUpdateCard(index, { title: e.target.value })}
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
                    onChange={(e) =>
                      handleUpdateCard(index, { badge: e.target.value || undefined })
                    }
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
                      if (val) handleUpdateCard(index, { size: val as "1" | "2" | "3" });
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
                  onChange={(e) => handleUpdateCard(index, { description: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
