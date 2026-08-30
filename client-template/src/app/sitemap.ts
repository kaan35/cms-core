import { api, extractData } from "@cms/client-sdk";
import type { BlogPostDoc } from "@cms/plugin-blog-api";
import type { PageDoc } from "@cms/plugin-pages-api";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";

  // 1. Static base routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // 2. Published pages
  const pagesRes = await api
    .get<{ data?: PageDoc[] } | PageDoc[]>("/pages", {
      params: { status: "published" },
    })
    .catch(() => []);

  const pages = extractData<PageDoc>(pagesRes);

  const pageRoutes: MetadataRoute.Sitemap = pages
    .filter((p) => p.slug !== "home" && p.slug !== "index")
    .map((page) => ({
      url: `${siteUrl}/${page.slug}`,
      lastModified: page.updatedAt ? new Date(page.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  // 3. Published blog articles
  const postsRes = await api
    .get<{ data?: BlogPostDoc[] }>("/blog", {
      params: { status: "published", limit: 100 },
    })
    .catch(() => ({ data: [] }));

  const posts = extractData<BlogPostDoc>(postsRes);
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...pageRoutes, ...blogRoutes];
}
