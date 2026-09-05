"use client";

import { Button, InputSearchField } from "@cms/admin-shell";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";

interface FormListToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
}

export function FormListToolbar({ search, onSearchChange, onRefresh }: FormListToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <InputSearchField
        placeholder="Search forms by title or slug..."
        value={search}
        onSearchChange={onSearchChange}
        containerClassName="w-full sm:max-w-xs flex-1"
        className="h-8 text-xs w-full"
      />

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          title="Refresh forms list"
          iconStart={<RefreshCw />}
        />

        <Link href="/dashboard/forms/new" className="flex-1 sm:flex-none">
          <Button iconStart={<Plus />} className="w-full sm:w-auto">
            Create Form
          </Button>
        </Link>
      </div>
    </div>
  );
}
