"use client";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cms/admin-shell";
import { MediaPicker } from "@cms/plugin-media-admin";

interface BlogPostSidebarProps {
  status: "draft" | "published";
  onStatusChange: (val: "draft" | "published") => void;
  coverMediaId?: string | undefined;
  onCoverMediaChange: (coverMediaId?: string | undefined) => void;
}

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

        <div className="space-y-1.5">
          <Label htmlFor="post-status">Status</Label>
          <Select
            value={status}
            onValueChange={(val) => onStatusChange(val as "draft" | "published")}
          >
            <SelectTrigger id="post-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-muted-foreground" />
                  Draft
                </span>
              </SelectItem>
              <SelectItem value="published">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Published
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
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
