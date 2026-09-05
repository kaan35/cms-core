"use client";

import { Button, cn, InputSearchField } from "@cms/admin-shell";
import { Grid, List as ListIcon, RefreshCw, UploadCloud } from "lucide-react";

interface MediaToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  typeFilter: "all" | "image" | "document" | "other";
  onTypeFilterChange: (type: "all" | "image" | "document" | "other") => void;
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  onRefresh: () => void;
  onUploadClick: () => void;
  isUploading: boolean;
}

export function MediaToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  onUploadClick,
  isUploading,
}: MediaToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
        <InputSearchField
          placeholder="Search assets..."
          value={search}
          onSearchChange={onSearchChange}
          containerClassName="w-full sm:max-w-sm"
          className="bg-card w-full"
        />

        <div className="flex items-center rounded-lg border border-border/80 bg-card p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onTypeFilterChange("all")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              typeFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onTypeFilterChange("image")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              typeFilter === "image"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Images
          </button>
          <button
            type="button"
            onClick={() => onTypeFilterChange("document")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              typeFilter === "document"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Docs
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex items-center rounded-lg border border-border/80 bg-card p-1">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors cursor-pointer",
              viewMode === "grid"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Grid View"
          >
            <Grid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={cn(
              "rounded-md p-1.5 transition-colors cursor-pointer",
              viewMode === "table"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Table View"
          >
            <ListIcon className="size-4" />
          </button>
        </div>

        <Button variant="outline" size="icon" onClick={onRefresh} iconStart={<RefreshCw />} />

        <Button
          onClick={onUploadClick}
          disabled={isUploading}
          iconStart={<UploadCloud />}
          className="flex-1 sm:flex-none"
        >
          {isUploading ? "Uploading..." : "Upload File"}
        </Button>
      </div>
    </div>
  );
}
