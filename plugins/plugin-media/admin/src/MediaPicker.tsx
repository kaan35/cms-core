"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
} from "@cms/admin-shell";
import { Image as ImageIcon, Plus, Replace, X } from "lucide-react";
import * as React from "react";
import { MediaLibrary, type MediaItem } from "./MediaLibrary";

export interface MediaPickerProps {
  value?: string | null | undefined;
  onChange: (media: { id: string; url: string; filename?: string | undefined } | null) => void;
  label?: string | undefined;
  description?: string | undefined;
  className?: string | undefined;
  dialogTitle?: string | undefined;
  aspectRatio?: "square" | "video" | "wide" | "auto" | undefined;
}

export function MediaPicker({
  value,
  onChange,
  label,
  description,
  className,
  dialogTitle = "Select Media Asset",
  aspectRatio = "video",
}: MediaPickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (item: MediaItem) => {
    onChange({
      id: item.id,
      url: item.url,
      filename: item.filename,
    });
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const aspectClass = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[21/9]",
    auto: "h-40 w-full",
  }[aspectRatio];

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="text-xs font-medium text-foreground block">{label}</label>}

      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-card p-2">
          <div className="relative w-full overflow-hidden rounded-lg bg-muted/40 flex items-center justify-center">
            <img
              src={value}
              alt="Selected media"
              className="w-full h-auto max-h-56 object-cover rounded-md"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(true)}
                iconStart={<Replace />}
              >
                Change
              </Button>
              <Button type="button" variant="destructive" onClick={handleClear} iconStart={<X />}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 hover:border-primary/50 bg-card/40 hover:bg-card/70 p-4 text-center transition-all cursor-pointer",
            aspectClass,
          )}
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors">
            <ImageIcon className="size-4" />
          </div>
          <span className="mt-2 text-xs font-medium text-foreground flex items-center gap-1">
            <Plus className="size-3" />
            Select or upload image
          </span>
          {description && (
            <span className="text-[11px] text-muted-foreground mt-0.5">{description}</span>
          )}
        </button>
      )}

      {/* Picker Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-w-3xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription className="text-xs">
              Choose an image from your library or upload a new file.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pt-2 pb-1 pr-1">
            <MediaLibrary selectable selectedId={value || undefined} onSelect={handleSelect} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
