import { getInternalApiUrl } from "@/lib/config";
import { translate } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import DynamicForm from "./DynamicForm";

interface BlockData {
  id: string;
  type: "hero" | "text" | "form" | "blog_posts";
  title?: string | Record<string, string>;
  subtitle?: string | Record<string, string>;
  content?: string | Record<string, string>;
  formId?: string;
  count?: number;
}

interface BlogPost {
  title: string | Record<string, string>;
  slug: string;
  summary: string | Record<string, string>;
  createdAt: string;
}

interface BlockRendererProps {
  blocks: BlockData[];
  locale?: string;
}

// Fetch Form Schema dynamically
async function fetchFormSchema(formId: string) {
  const API_BASE = getInternalApiUrl();
  try {
    const res = await fetch(`${API_BASE}/forms/${formId}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.form;
  } catch (err) {
    console.error(`Failed to fetch form schema for formId: ${formId}`, err);
    return null;
  }
}

// Fetch Blog Posts dynamically
async function fetchBlogPosts(limit = 5): Promise<BlogPost[]> {
  const API_BASE = getInternalApiUrl();
  try {
    const res = await fetch(`${API_BASE}/blog?status=published`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.posts || []).slice(0, limit);
  } catch (err) {
    console.error("Failed to fetch blog posts for renderer:", err);
    return [];
  }
}

export default async function BlockRenderer({ blocks, locale = "tr" }: BlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-20 pb-20">
      {blocks.map(async (block) => {
        switch (block.type) {
          case "hero":
            return (
              <section
                key={block.id}
                className="relative py-24 flex flex-col items-center text-center overflow-hidden border-b border-card-border"
              >
                {/* Background neon blur */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-blue-500/5 dark:bg-blue-600/10 blur-[100px] pointer-events-none"></div>
                <div className="relative max-w-3xl mx-auto px-6 space-y-6">
                  <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                    {translate(block.title, locale) || "Default Hero Title"}
                  </h1>
                  <p className="text-lg sm:text-xl text-muted max-w-xl mx-auto font-medium">
                    {translate(block.subtitle, locale) || "Default Hero Subtitle"}
                  </p>
                </div>
              </section>
            );

          case "text":
            return (
              <section key={block.id} className="max-w-3xl mx-auto px-6">
                <div className="max-w-none text-foreground/85 leading-8 text-md text-center sm:text-left whitespace-pre-line">
                  {translate(block.content, locale) || "Default text block content."}
                </div>
              </section>
            );

          case "form": {
            if (!block.formId) return null;
            const formSchema = await fetchFormSchema(block.formId);
            if (!formSchema) {
              return (
                <div key={block.id} className="text-center text-xs text-muted py-6">
                  Form could not be loaded ({block.formId})
                </div>
              );
            }
            return (
              <section key={block.id} className="max-w-3xl mx-auto px-6 text-center">
                <DynamicForm
                  formId={formSchema.formId}
                  name={formSchema.name}
                  fields={formSchema.fields}
                />
              </section>
            );
          }

          case "blog_posts": {
            const posts = await fetchBlogPosts(block.count);
            return (
              <section key={block.id} className="max-w-5xl mx-auto px-6 space-y-8">
                <h3 className="text-2xl font-bold tracking-tight text-foreground border-b border-card-border pb-3">
                  Son Paylaşılan Yazılar
                </h3>
                {posts.length === 0 ? (
                  <p className="text-sm text-muted">Henüz yayınlanmış yazı bulunmuyor.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {posts.map((post) => (
                      <div
                        key={post.slug}
                        className="rounded-2xl border border-card-border bg-card p-6 shadow-md hover:border-blue-500/30 transition duration-150 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-600/10 px-2 py-0.5 rounded">
                            Blog
                          </span>
                          <h4 className="text-lg font-bold text-foreground leading-snug">
                            {translate(post.title, locale)}
                          </h4>
                          <p className="text-sm text-muted line-clamp-3">
                            {translate(post.summary, locale)}
                          </p>
                        </div>
                        <div className="mt-5 pt-4 border-t border-card-border flex justify-between items-center text-xs text-muted">
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          <Link
                            href={`/blog/${post.slug}`}
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-semibold cursor-pointer transition duration-150"
                          >
                            Daha Fazla Oku
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
