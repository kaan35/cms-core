"use client";

import { InputSelectField } from "@cms/admin-shell";
import { MediaPicker } from "@cms/plugin-media-admin";

interface BlogPostSidebarProps {
  status: "draft" | "published";
  onStatusChange: (val: "draft" | "published") => void;
  coverMediaId?: string | undefined;
  onCoverMediaChange: (coverMediaId?: string | undefined) => void;
}

const STATUS_OPTIONS = [
  {
    value: "draft",
    label: (
      <span className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-muted-foreground" />
        Draft
      </span>
    ),
  },
  {
    value: "published",
    label: (
      <span className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-emerald-500" />
        Published
      </span>
    ),
  },
];

export function BlogPostSidebar({
  status,
  onStatusChange,
  coverMediaId,
  onCoverMediaChange,
}: BlogPostSidebarProps) {
  return (
    <div className="space-y-6 lg:col-span-4">
      {/* Publishing Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Publishing Options
        </h3>

        <InputSelectField
          label="Status"
          value={status}
          onValueChange={(val) => onStatusChange(val as "draft" | "published")}
          options={STATUS_OPTIONS}
        />
      </div>

      {/* Cover Media Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cover Image
        </h3>
        <MediaPicker
          value={coverMediaId}
          onChange={(media) => onCoverMediaChange(media?.url || media?.id || undefined)}
          dialogTitle="Select Blog Cover Image"
          aspectRatio="video"
          description="Header banner image for article header and social share preview"
        />
      </div>
    </div>
  );
}
