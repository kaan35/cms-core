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
import { MediaPicker } from "@cms/plugin-media-admin";
import { GripVertical, Plus, Trash2 } from "lucide-react";

export interface GalleryItem {
  mediaId: string;
  caption?: string | undefined;
}

export interface GalleryBlockData {
  type: "gallery";
  title?: string | undefined;
  layout: "grid" | "masonry";
  images: GalleryItem[];
}

export interface GalleryBlockFormProps {
  data: GalleryBlockData;
  onChange: (data: GalleryBlockData) => void;
}

export function GalleryBlockForm({ data, onChange }: GalleryBlockFormProps) {
  const images = Array.isArray(data.images) ? data.images : [];

  const handleAddImage = () => {
    onChange({
      ...data,
      images: [...images, { mediaId: "", caption: "" }],
    });
  };

  const handleUpdateImage = (index: number, updated: Partial<GalleryItem>) => {
    const existing = images[index];
    if (!existing) return;
    const nextImages = [...images];
    nextImages[index] = {
      mediaId: updated.mediaId !== undefined ? updated.mediaId : existing.mediaId,
      caption: updated.caption !== undefined ? updated.caption : existing.caption,
    };
    onChange({ ...data, images: nextImages });
  };

  const handleRemoveImage = (index: number) => {
    const nextImages = images.filter((_, i) => i !== index);
    onChange({ ...data, images: nextImages });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="gallery-title">Gallery Title (Optional)</Label>
          <Input
            id="gallery-title"
            placeholder="e.g. Featured Projects & Showcase"
            value={data.title || ""}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gallery-layout">Layout Style</Label>
          <Select
            value={data.layout || "grid"}
            onValueChange={(val) => onChange({ ...data, layout: val as "grid" | "masonry" })}
          >
            <SelectTrigger id="gallery-layout">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Clean Uniform Grid</SelectItem>
              <SelectItem value="masonry">Dynamic Masonry Flow</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">
            Gallery Images ({images.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddImage}
            className="h-7 text-xs gap-1 border-dashed"
          >
            <Plus className="size-3" />
            Add Image
          </Button>
        </div>

        {images.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center">
            <p className="text-xs text-muted-foreground">No images added to gallery yet.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddImage}
              className="mt-2 text-xs gap-1.5"
            >
              <Plus className="size-3" />
              Add First Image
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {images.map((img, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3"
              >
                <div className="pt-2 text-muted-foreground">
                  <GripVertical className="size-4" />
                </div>

                <div className="w-32 shrink-0">
                  <MediaPicker
                    value={img.mediaId}
                    onChange={(media) =>
                      handleUpdateImage(index, {
                        mediaId: media?.url || media?.id || "",
                      })
                    }
                    aspectRatio="square"
                    className="space-y-0"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Caption or description (optional)"
                    value={img.caption || ""}
                    onChange={(e) => handleUpdateImage(index, { caption: e.target.value })}
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Image #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveImage(index)}
                      className="h-7 text-destructive hover:bg-destructive/10 text-xs gap-1"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
