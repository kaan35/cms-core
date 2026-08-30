"use client";

import { formatDate } from "@/lib/utils";
import { useApi } from "@cms/client-sdk";
import type { BlogPostDoc } from "@cms/plugin-blog-api";
import { ArrowRight, Calendar, Loader2, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export function SearchBox() {
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);

  const shouldFetch = query.trim().length > 1;
  const { data, isLoading } = useApi<
    { items?: BlogPostDoc[]; data?: BlogPostDoc[]; posts?: BlogPostDoc[] } | BlogPostDoc[]
  >(shouldFetch ? `/blog/search?q=${encodeURIComponent(query.trim())}` : null, undefined, {
    keepPreviousData: true,
  });

  const results: BlogPostDoc[] = Array.isArray(data)
    ? data
    : (data as { items?: BlogPostDoc[]; data?: BlogPostDoc[]; posts?: BlogPostDoc[] })?.items ||
      (data as { items?: BlogPostDoc[]; data?: BlogPostDoc[]; posts?: BlogPostDoc[] })?.posts ||
      (data as { items?: BlogPostDoc[]; data?: BlogPostDoc[]; posts?: BlogPostDoc[] })?.data ||
      [];

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          id="searchArticles"
          name="searchArticles"
          aria-label="Search articles"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search articles by title, tags or content..."
          className="w-full rounded-xl border border-border bg-card/80 pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all"
        />
        {isLoading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Live Dropdown Results */}
      {isFocused && shouldFetch && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsFocused(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-border bg-card p-2 shadow-2xl backdrop-blur-xl">
            {isLoading && results.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>Searching articles...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                {results.slice(0, 5).map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    onClick={() => setIsFocused(false)}
                    className="block p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {post.title}
                      </div>
                      <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    {post.summary && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {post.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No matching articles found for &quot;{query}&quot;
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
