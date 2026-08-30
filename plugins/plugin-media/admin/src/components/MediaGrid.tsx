"use client";

import { Badge, Button, cn, formatBytes, Skeleton } from "@cms/admin-shell";
import { Check, Image as ImageIcon, Trash2 } from "lucide-react";
import { getFileIcon } from "./mediaIcons";
import type { MediaItem } from "./useMediaLibrary";

interface MediaGridProps {
  items: MediaItem[];
  isLoading: boolean;
  search: string;
  viewMode: "grid" | "table";
  selectable?: boolean | undefined;
  selectedId?: string | undefined;
  onItemClick: (item: MediaItem) => void;
  onDeleteItem: (item: MediaItem) => void;
}

export function MediaGrid({
  items,
  isLoading,
  search,
  viewMode,
  selectable: _selectable,
  selectedId,
  onItemClick,
  onDeleteItem,
}: MediaGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/80 bg-card p-2 space-y-2">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-12 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
          <ImageIcon className="size-6 opacity-80" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No media assets found</h3>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
          {search
            ? "No files match your search query."
            : "Upload images, documents, and media to build your asset library."}
        </p>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => {
          const isImage = item.mimeType.startsWith("image/");
          const Icon = getFileIcon(item.mimeType);
          const isSelected = selectedId === item.id || selectedId === item.url;

          return (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              className={cn(
                "group relative flex flex-col rounded-xl border border-border/80 bg-card p-2.5 transition-all hover:shadow-md cursor-pointer",
                isSelected && "ring-2 ring-primary border-primary",
              )}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/40 flex items-center justify-center">
                {isImage ? (
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <Icon className="size-10 text-muted-foreground group-hover:text-primary transition-colors" />
                )}

                {isSelected && (
                  <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow">
                    <Check className="size-3.5" />
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="mt-2 space-y-0.5">
                <p className="truncate text-xs font-medium text-foreground" title={item.filename}>
                  {item.filename}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatBytes(item.size)}</span>
                  <span className="uppercase text-[10px]">
                    {item.mimeType.split("/")[1] || "file"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Asset</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {items.map((item) => {
            const isImage = item.mimeType.startsWith("image/");
            const Icon = getFileIcon(item.mimeType);
            return (
              <tr
                key={item.id}
                onClick={() => onItemClick(item)}
                className="hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                      {isImage ? (
                        <img
                          src={item.url}
                          alt={item.filename}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Icon className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-medium text-foreground max-w-xs truncate">
                      {item.filename}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {item.mimeType}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatBytes(item.size)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item);
                    }}
                    iconStart={<Trash2 className="text-destructive" />}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
