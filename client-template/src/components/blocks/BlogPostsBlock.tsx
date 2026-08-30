import { formatDate, resolveMediaUrl } from "@/lib/utils";
import { api } from "@cms/client-sdk";
import type { BlogPostDoc } from "@cms/plugin-blog-api";
import type { BlogPostsBlock as BlogPostsBlockType } from "@cms/plugin-pages-api";
import { ArrowRight, BookOpen, Calendar } from "lucide-react";
import Link from "next/link";

export async function BlogPostsBlock({ data }: { data: BlogPostsBlockType }) {
  const limit = data.limit || 3;
  const layout = data.layout || "grid";

  const title = data.title || "From Our Blog";
  const badge = data.badge || "Latest Articles";
  const viewAllLabel = data.viewAllLabel || "View all articles";
  const viewAllUrl = data.viewAllUrl || "/blog";
  const readMoreLabel = data.readMoreLabel || "Read article";

  const postsRes = await api
    .get<{ data?: BlogPostDoc[] }>("/blog", {
      params: { status: "published", limit },
    })
    .catch(() => ({ data: [] }));

  const posts = postsRes?.data || [];

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              <BookOpen className="size-3.5" />
              <span>{badge}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            {data.subtitle && <p className="mt-1 text-sm text-muted-foreground">{data.subtitle}</p>}
          </div>

          <Link
            href={viewAllUrl}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline group"
          >
            <span>{viewAllLabel}</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {layout === "list" ? (
          <div className="flex flex-col gap-4">
            {posts.map((post) => {
              const coverUrl = resolveMediaUrl(post.coverMediaId);

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col sm:flex-row gap-6 items-center overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                >
                  {coverUrl && (
                    <div className="aspect-[16/9] sm:aspect-square sm:size-32 w-full shrink-0 overflow-hidden rounded-xl bg-muted/40">
                      <img
                        src={coverUrl}
                        alt={post.title}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col justify-center w-full">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <Calendar className="size-3.5" />
                      <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {post.title}
                    </h3>

                    {post.summary && (
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {post.summary}
                      </p>
                    )}
                  </div>

                  <div className="hidden sm:flex items-center text-primary pr-2">
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const coverUrl = resolveMediaUrl(post.coverMediaId);

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:border-primary/50 hover:shadow-xl transition-all duration-300"
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

                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>

                    {post.summary && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                        {post.summary}
                      </p>
                    )}

                    <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
                      <span>{readMoreLabel}</span>
                      <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
