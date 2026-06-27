import { getInternalApiUrl } from "@/lib/config";
import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "http://localhost:3002";
  const apiBaseUrl = getInternalApiUrl();

  let posts: any[] = [];
  let brandName = "ModularCMS";

  try {
    const blogRes = await fetch(`${apiBaseUrl}/blog`, { cache: "no-store" });
    if (blogRes.ok) {
      const data = await blogRes.json();
      posts = data.posts || [];
    }
  } catch (err) {
    console.error("RSS Feed: Failed to fetch blog posts:", err);
  }

  try {
    const settingsRes = await fetch(`${apiBaseUrl}/settings`, { cache: "no-store" });
    if (settingsRes.ok) {
      const data = await settingsRes.json();
      brandName = data.settings?.brandName || "ModularCMS";
    }
  } catch (err) {
    console.error("RSS Feed: Failed to fetch brand settings:", err);
  }

  const itemsXml = posts
    .map((post) => {
      const pubDate = new Date(post.createdAt).toUTCString();
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.summary || ""}]]></description>
    </item>`;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${brandName} Blog Feed</title>
    <link>${baseUrl}</link>
    <description>Latest stories and content updates from ${brandName}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
