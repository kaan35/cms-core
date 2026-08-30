"use client";

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cms/admin-shell";
import { BookOpen, Compass, Home, Plus } from "lucide-react";
import type { PublishedPage } from "./useNavigationMenu";

interface AddMenuItemPanelProps {
  publishedPages: PublishedPage[];
  selectedPageId: string;
  onSelectPageId: (id: string) => void;
  onAddSelectedPage: () => void;
  selectedPresetRoute: string;
  onSelectPresetRoute: (route: string) => void;
  onAddSelectedPreset: () => void;
  onAddCustomLink: () => void;
}

export function AddMenuItemPanel({
  publishedPages,
  selectedPageId,
  onSelectPageId,
  onAddSelectedPage,
  selectedPresetRoute,
  onSelectPresetRoute,
  onAddSelectedPreset,
  onAddCustomLink,
}: AddMenuItemPanelProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Plus className="size-3.5 text-primary" />
          Add Menu Items
        </span>
        <Button type="button" variant="outline" onClick={onAddCustomLink} iconStart={<Plus />}>
          Custom Link
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        {/* Column 1: Add CMS Page */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground font-medium">
            Add Published CMS Page (Auto-Synced)
          </Label>
          <div className="flex items-center gap-2">
            <Select
              value={selectedPageId}
              onValueChange={(val) => onSelectPageId(val || "")}
              disabled={publishedPages.length === 0}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue
                  placeholder={
                    publishedPages.length === 0
                      ? "No published pages available"
                      : "Select a page to add..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {publishedPages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.title} (/{page.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={!selectedPageId}
              onClick={onAddSelectedPage}
            >
              Add Page
            </Button>
          </div>
        </div>

        {/* Column 2: Add Preset System Route */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground font-medium">
            Add Preset System Route
          </Label>
          <div className="flex items-center gap-2">
            <Select
              value={selectedPresetRoute}
              onValueChange={(val) => onSelectPresetRoute(val || "")}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Select a preset route..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/blog">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-3.5 text-primary" />
                    <span>Blog (/blog)</span>
                  </div>
                </SelectItem>
                <SelectItem value="/">
                  <div className="flex items-center gap-2">
                    <Home className="size-3.5 text-primary" />
                    <span>Home (/)</span>
                  </div>
                </SelectItem>
                <SelectItem value="/dashboard">
                  <div className="flex items-center gap-2">
                    <Compass className="size-3.5 text-primary" />
                    <span>Admin Portal (/dashboard)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={!selectedPresetRoute}
              onClick={onAddSelectedPreset}
            >
              Add Route
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
