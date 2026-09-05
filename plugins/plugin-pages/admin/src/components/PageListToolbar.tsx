"use client";

import { Button, Input } from "@cms/admin-shell";
import { Plus, RefreshCw, Search } from "lucide-react";
import Link from "next/link";

interface PageListToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: "all" | "published" | "draft";
  onStatusFilterChange: (val: "all" | "published" | "draft") => void;
  onRefresh: () => void;
}

export function PageListToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}: PageListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-card w-full"
          />
        </div>

        <div className="flex items-center rounded-lg border border-border/80 bg-card p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onStatusFilterChange("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange("published")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === "published"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Published
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange("draft")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === "draft"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Drafts
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button variant="outline" size="icon" onClick={onRefresh} iconStart={<RefreshCw />} />

        <Link href="/dashboard/pages/new" className="flex-1 sm:flex-none">
          <Button iconStart={<Plus />} className="w-full sm:w-auto">
            Create Page
          </Button>
        </Link>
      </div>
    </div>
  );
}
