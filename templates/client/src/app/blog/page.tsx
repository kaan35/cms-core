import { getInternalApiUrl } from "@/lib/config";
import { translate } from "@/lib/i18n";
import { ArrowRight, BookOpen, Calendar } from "lucide-react";
import Link from "next/link";

async function getBlogPosts() {
  const API_BASE = getInternalApiUrl();
  try {
    const res = await fetch(`${API_BASE}/blog?status=published`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.posts || [];
  } catch (err) {
    console.error("Failed to fetch blog posts:", err);
    return null;
  }
}

export default async function BlogListPage() {
  const posts = await getBlogPosts();

  if (posts === null) {
    const { notFound } = await import("next/navigation");
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-3 border-b border-card-border pb-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">Blog</h1>
        <p className="text-muted text-lg">Makaleler, duyurular ve güncellemeler</p>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <BookOpen className="h-16 w-16 text-muted/50" />
          <h2 className="text-2xl font-bold text-foreground">Henüz makale yok</h2>
          <p className="text-muted max-w-md">
            Yayınlanmış blog yazısı bulunamadı. Admin panelinden yeni içerik ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post: any) => (
            <Link key={post._id} href={`/blog/${post.slug}`} className="block group">
              <article className="p-6 rounded-xl border border-card-border bg-card hover:border-blue-500/50 transition-all duration-200 space-y-3">
                {/* Title */}
                <h2 className="text-2xl font-bold text-foreground group-hover:text-blue-500 transition">
                  {translate(post.title)}
                </h2>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(post.createdAt).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {post.status === "published" ? "Yayında" : "Taslak"}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-muted leading-relaxed">{translate(post.summary)}</p>

                {/* Read more */}
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-500 group-hover:gap-3 transition-all">
                  Devamını Oku
                  <ArrowRight className="h-4 w-4" />
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {/* Back to home */}
      <div className="pt-8 border-t border-card-border">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground transition"
        >
          ← Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
