"use client";

import { UploadCloud } from "lucide-react";

interface MediaUploadZoneProps {
  onFilesSelected: (files: FileList | null) => void;
  onClick: () => void;
}

export function MediaUploadZone({ onFilesSelected, onClick }: MediaUploadZoneProps) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onFilesSelected(e.dataTransfer.files);
      }}
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 hover:border-primary/50 bg-card/40 hover:bg-card/70 p-6 text-center transition-all cursor-pointer"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
        <UploadCloud className="size-5" />
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">
        Click to upload or drag & drop files here
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WebP, SVG, PDF up to 10MB</p>
    </div>
  );
}
