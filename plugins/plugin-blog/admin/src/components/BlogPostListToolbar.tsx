"use client";

import { Button, InputSearchField, SelectFilter, Tooltip } from "@cms/admin-shell";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";

interface BlogPostListToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: "all" | "published" | "draft";
  onStatusFilterChange: (val: "all" | "published" | "draft") => void;
  onRefresh: () => void;
}

export function BlogPostListToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}: BlogPostListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-3">
        <InputSearchField
          placeholder="Search articles by title, slug, or summary..."
          value={search}
          onSearchChange={onSearchChange}
          className="bg-card"
          containerClassName="flex-1 w-full sm:max-w-sm"
        />

        <div className="w-32">
          <SelectFilter
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Drafts" },
            ]}
            placeholder="All Statuses"
            className="h-8 text-xs min-w-32 w-full bg-card"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Tooltip content="Refresh posts">
          <Button variant="outline" size="icon" onClick={onRefresh} iconStart={<RefreshCw />} />
        </Tooltip>

        <Link href="/dashboard/blog/new" className="flex-1 sm:flex-none">
          <Button iconStart={<Plus />} className="w-full sm:w-auto">
            Write Article
          </Button>
        </Link>
      </div>
    </div>
  );
}
