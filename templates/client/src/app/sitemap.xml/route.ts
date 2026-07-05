import { getInternalApiUrl, getPublicSiteUrl } from "@/lib/config";

interface SitemapPage {
  slug: string;
}

interface SitemapPost {
  slug: string;
  createdAt: string;
  updatedAt?: string;
}

export async function GET() {
  const baseUrl = getPublicSiteUrl();
  const apiBaseUrl = getInternalApiUrl();

  let pages: SitemapPage[] = [];
  let posts: SitemapPost[] = [];

  try {
    const pagesRes = await fetch(`${apiBaseUrl}/pages`, { cache: "no-store" });
    if (pagesRes.ok) {
      const data = await pagesRes.json();
      pages = data.pages || [];
    }
  } catch (err) {
    console.error("Sitemap: Failed to fetch pages:", err);
  }

  try {
    const blogRes = await fetch(`${apiBaseUrl}/blog`, { cache: "no-store" });
    if (blogRes.ok) {
      const data = await blogRes.json();
      posts = data.posts || [];
    }
  } catch (err) {
    console.error("Sitemap: Failed to fetch blog posts:", err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${pages
    .filter((p) => p.slug !== "home")
    .map((p) => {
      return `
  <url>
    <loc>${baseUrl}/${p.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join("")}
  <!-- Blog Posts -->
  ${posts
    .map((post) => {
      return `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <lastmod>${new Date(post.updatedAt || post.createdAt).toISOString().split("T")[0]}</lastmod>
  </url>`;
    })
    .join("")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
