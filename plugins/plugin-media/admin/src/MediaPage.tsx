"use client";

import { formatBytes, PageHeader, StatCard, useApi } from "@cms/admin-shell";
import { Files, HardDrive, ImageIcon } from "lucide-react";
import * as React from "react";
import { MediaLibrary, type MediaItem } from "./MediaLibrary";

export function MediaPage() {
  const { data: rawData } = useApi<
    | {
        data: MediaItem[];
        total: number;
      }
    | MediaItem[]
  >("/api/media?limit=100");

  const mediaList: MediaItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const totalSize = React.useMemo(() => {
    return mediaList.reduce((acc, item) => acc + (item.size || 0), 0);
  }, [mediaList]);

  const imageCount = React.useMemo(() => {
    return mediaList.filter((item) => item.mimeType.startsWith("image/")).length;
  }, [mediaList]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Upload, organize, and manage your image assets and files across all pages and articles."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Files"
          value={mediaList.length}
          description="Assets in cloud storage"
          icon={Files}
        />
        <StatCard
          title="Images"
          value={imageCount}
          description="JPG, PNG, WebP, SVG"
          icon={ImageIcon}
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(totalSize)}
          description="Combined asset footprint"
          icon={HardDrive}
        />
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <MediaLibrary />
      </div>
    </div>
  );
}
