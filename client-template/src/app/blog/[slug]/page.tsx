import { formatDate, resolveMediaUrl } from "@/lib/utils";
import { api } from "@cms/client-sdk";
import type { BlogPostDoc } from "@cms/plugin-blog-api";
import { ArrowLeft, Calendar, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await api.get<BlogPostDoc>(`/blog/${slug}`).catch(() => null);

  if (!post) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.summary,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await api.get<BlogPostDoc>(`/blog/${slug}`).catch(() => null);

  if (!post || post.status !== "published") {
    notFound();
  }

  const coverUrl = resolveMediaUrl(post.coverMediaId);

  return (
    <article className="py-12 sm:py-20">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6">
        {/* Back Link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to all articles</span>
        </Link>

        {/* Header */}
        <header className="space-y-4 mb-10">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            </span>
            {Boolean(post.authorId) && (
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" />
                <span>Author</span>
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground sm:leading-tight">
            {post.title}
          </h1>

          {post.summary && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {post.summary}
            </p>
          )}
        </header>

        {/* Cover Image */}
        {coverUrl && (
          <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border bg-muted/40 mb-12 shadow-lg">
            <img src={coverUrl} alt={post.title} className="size-full object-cover" />
          </div>
        )}

        {/* Article Body */}
        <div
          className="prose prose-invert prose-zinc max-w-none text-muted-foreground leading-relaxed space-y-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-foreground [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:text-foreground [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-foreground [&>p]:text-sm sm:[&>p]:text-base [&>a]:text-primary [&>a]:underline [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>blockquote]:border-l-2 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic"
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
        />
      </div>
    </article>
  );
}
