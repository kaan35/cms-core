"use client";

import {
  Button,
  cn,
  InputSearchField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
} from "@cms/admin-shell";
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

        <div className="w-32">
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              if (val !== null && val !== undefined) {
                onTypeFilterChange(val as "all" | "image" | "document" | "other");
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs min-w-32 w-full bg-card">
              <SelectValue placeholder="All Types">
                {(val: unknown) => {
                  switch (val) {
                    case "image":
                      return "Images";
                    case "document":
                      return "Documents";
                    case "other":
                      return "Other";
                    default:
                      return "All Types";
                  }
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
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

        <Tooltip content="Refresh media">
          <Button variant="outline" size="icon" onClick={onRefresh} iconStart={<RefreshCw />} />
        </Tooltip>

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
