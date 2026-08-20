"use client";

import { PageHeader, StatCard, useApi } from "@cms/admin-shell";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import * as React from "react";
import { PageList, type PageListItem } from "./PageList";

export function PagesListPage() {
  const { data: rawData } = useApi<
    | {
        data: PageListItem[];
        total: number;
      }
    | PageListItem[]
  >("/api/pages");

  const pages: PageListItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const publishedCount = React.useMemo(() => {
    return pages.filter((p) => p.status === "published").length;
  }, [pages]);

  const draftCount = React.useMemo(() => {
    return pages.filter((p) => p.status === "draft").length;
  }, [pages]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pages Management"
        description="Design, compose, and manage dynamic landing pages, marketing pages, and content routes."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Pages"
          value={pages.length}
          description="All site pages"
          icon={FileText}
        />
        <StatCard
          title="Published Pages"
          value={publishedCount}
          description="Live on public client"
          icon={CheckCircle2}
        />
        <StatCard
          title="Draft Pages"
          value={draftCount}
          description="In review or editing"
          icon={Clock}
        />
      </div>

      <PageList />
    </div>
  );
}
