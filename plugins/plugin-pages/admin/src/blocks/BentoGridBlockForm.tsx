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
} from "@cms/admin-shell";
import { Columns, Plus, Sparkles, Zap } from "lucide-react";
import { BentoCardItem } from "./BentoCardItem";

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
            <BentoCardItem
              key={index}
              card={card}
              index={index}
              totalCards={cards.length}
              onUpdate={(patch) => handleUpdateCard(index, patch)}
              onRemove={() => handleRemoveCard(index)}
              onMove={(direction) => handleMoveCard(index, direction)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
