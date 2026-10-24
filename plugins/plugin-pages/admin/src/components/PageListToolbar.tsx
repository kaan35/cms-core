"use client";

import {
  Button,
  InputSearchField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
} from "@cms/admin-shell";
import { Plus, RefreshCw } from "lucide-react";
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
        <InputSearchField
          placeholder="Search by title or slug..."
          value={search}
          onSearchChange={onSearchChange}
          containerClassName="w-full sm:max-w-sm"
          className="bg-card w-full"
        />

        <div className="w-32">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val !== null && val !== undefined) {
                onStatusFilterChange(val as "all" | "published" | "draft");
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs min-w-32 w-full bg-card">
              <SelectValue placeholder="All Statuses">
                {(val: unknown) => {
                  switch (val) {
                    case "published":
                      return "Published";
                    case "draft":
                      return "Drafts";
                    default:
                      return "All Statuses";
                  }
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Tooltip content="Refresh pages">
          <Button variant="outline" size="icon" onClick={onRefresh} iconStart={<RefreshCw />} />
        </Tooltip>

        <Link href="/dashboard/pages/new" className="flex-1 sm:flex-none">
          <Button iconStart={<Plus />} className="w-full sm:w-auto">
            Create Page
          </Button>
        </Link>
      </div>
    </div>
  );
}
