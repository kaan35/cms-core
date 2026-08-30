import { SearchBox } from "@/components/SearchBox";
import { formatDate, resolveMediaUrl } from "@/lib/utils";
import { api } from "@cms/client-sdk";
import type { BlogPostDoc } from "@cms/plugin-blog-api";
import { ArrowRight, BookOpen, Calendar } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog & Insights",
  description: "Read the latest articles and insights.",
};

export default async function BlogIndexPage() {
  const res = await api
    .get<{ data: BlogPostDoc[] }>("/blog", {
      params: { status: "published", limit: 50 },
    })
    .catch(() => ({ data: [] }));

  const posts = res?.data || [];

  return (
    <div className="py-16 sm:py-24">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            <BookOpen className="size-3.5" />
            <span>Platform Articles</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Blog & Insights
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            In-depth guides, announcements, and engineering architecture patterns.
          </p>

          <div className="mt-8">
            <SearchBox />
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-16 text-center text-xs text-muted-foreground">
            No published blog posts found. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => {
              const coverUrl = resolveMediaUrl(post.coverMediaId);

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:border-primary/50 hover:shadow-2xl transition-all duration-300"
                >
                  {coverUrl && (
                    <div className="aspect-[16/9] w-full overflow-hidden bg-muted/40">
                      <img
                        src={coverUrl}
                        alt={post.title}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Calendar className="size-3.5" />
                      <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                    </div>

                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>

                    {post.summary && (
                      <p className="mt-2.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                        {post.summary}
                      </p>
                    )}

                    <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
                      <span>Read article</span>
                      <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
