"use client";

import { PageHeader, StatCard, useApi } from "@cms/admin-shell";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import * as React from "react";
import { BlogPostList, type BlogPostListItem } from "./BlogPostList";

export function BlogListPage() {
  const { data: rawData } = useApi<
    | {
        data: BlogPostListItem[];
        total: number;
      }
    | BlogPostListItem[]
  >("/api/blog");

  const posts: BlogPostListItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const publishedCount = React.useMemo(() => {
    return posts.filter((p) => p.status === "published").length;
  }, [posts]);

  const draftCount = React.useMemo(() => {
    return posts.filter((p) => p.status === "draft").length;
  }, [posts]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog & Articles"
        description="Draft, edit, version, and publish content articles, technical posts, and news."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Articles"
          value={posts.length}
          description="All created posts"
          icon={BookOpen}
        />
        <StatCard
          title="Published"
          value={publishedCount}
          description="Publicly visible"
          icon={CheckCircle2}
        />
        <StatCard
          title="Drafts"
          value={draftCount}
          description="In review or editing"
          icon={Clock}
        />
      </div>

      <BlogPostList />
    </div>
  );
}
