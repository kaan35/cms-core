import { getInternalApiUrl } from "@/lib/config";
import { translate } from "@/lib/i18n";
import { ArrowLeft, Calendar, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PostProps {
  params: Promise<{ postSlug: string }>;
}

async function getPostData(slug: string) {
  const API_BASE = getInternalApiUrl();
  try {
    const res = await fetch(`${API_BASE}/blog/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.post;
  } catch (err) {
    console.error(`Failed to fetch blog post for slug: ${slug}`, err);
    return null;
  }
}

export default async function BlogPostPage({ params }: PostProps) {
  const { postSlug } = await params;
  const post = await getPostData(postSlug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground cursor-pointer transition duration-150"
      >
        <ArrowLeft className="h-3 w-3" />
        Ana Sayfaya Dön
      </Link>

      {/* Post header info */}
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          {translate(post.title)}
        </h1>

        <div className="flex flex-wrap gap-4 text-xs text-muted pt-2 border-b border-card-border pb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.createdAt).toLocaleDateString("tr-TR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Yazar: Editör
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-muted text-lg leading-relaxed border-l-2 border-blue-500 pl-4 italic">
        {translate(post.summary)}
      </p>

      {/* Main Content */}
      <div className="max-w-none text-foreground/90 leading-8 text-md whitespace-pre-line pt-2">
        {translate(post.content)}
      </div>
    </article>
  );
}
